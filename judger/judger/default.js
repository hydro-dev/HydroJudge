const
    { STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR,
        STATUS_TIME_LIMIT_EXCEEDED, STATUS_MEMORY_LIMIT_EXCEEDED } = require('../status'),
    { CompileError } = require('../error'),
    { copyInDir, parseFilename } = require('../utils'),
    { run } = require('../sandbox'),
    { default: Queue } = require('p-queue'),
    path = require('path'),
    compile = require('../compile'),
    signals = require('../signals'),
    { check, compile_checker } = require('../check'),
    fs = require('fs'),
    Score = {
        sum: (a, b) => (a + b),
        max: Math.max,
        min: Math.min
    };

function judgeCase(c) {
    return async (ctx, ctx_subtask) => {
        let code, time_usage_ms, memory_usage_kb, filename = ctx.config.filename;
        let copyIn = ctx.execute.copyIn;
        if (ctx.config.filename) copyIn[`${filename}.in`] = { src: c.input };
        let copyOut = filename ? [`${filename}.out`] : [];
        let stdin = filename ? null : c.input;
        let stdout = path.resolve(ctx.tmpdir, `${c.id}.out`);
        let stderr = path.resolve(ctx.tmpdir, `${c.id}.err`);
        let res = await run(
            ctx.execute.execute.replace(/\$\{name\}/g, 'code'),
            {
                stdin, stdout: filename ? null : stdout, stderr,
                copyIn, copyOut,
                time_limit_ms: ctx_subtask.subtask.time_limit_ms,
                memory_limit_mb: ctx_subtask.subtask.memory_limit_mb
            }
        );
        ({ code, time_usage_ms, memory_usage_kb } = res);
        if (res.files[`${filename}.out`] || !fs.existsSync(stdout))
            fs.writeFileSync(stdout, res.files[`${filename}.out`] || '');
        let status, message = '', score;
        if (time_usage_ms > ctx_subtask.subtask.time_limit_ms)
            status = STATUS_TIME_LIMIT_EXCEEDED;
        else if (memory_usage_kb > ctx_subtask.subtask.memory_limit_mb * 1024)
            status = STATUS_MEMORY_LIMIT_EXCEEDED;
        else if (code) {
            status = STATUS_RUNTIME_ERROR;
            if (code < 32) message = signals[code];
            else message = `您的程序返回了 ${code}.`;
        } else[status, score, message] = await check({
            copyIn: copyInDir(path.resolve(ctx.tmpdir, 'checker')),
            stdin: c.input,
            stdout: c.output,
            user_stdout: stdout,
            user_stderr: stderr,
            checker: ctx.config.checker,
            checker_type: ctx.config.checker_type,
            score: ctx_subtask.subtask.score,
            detail: ctx.config.detail
        });
        ctx_subtask.score = Score[ctx_subtask.subtask.type](ctx_subtask.score, score);
        ctx_subtask.status = Math.max(ctx_subtask.status, status);
        ctx.total_time_usage_ms += time_usage_ms;
        ctx.total_memory_usage_kb = Math.max(ctx.total_memory_usage_kb, memory_usage_kb);
        ctx.next({
            status: STATUS_JUDGING,
            case: {
                status,
                score: 0,
                time_ms: time_usage_ms,
                memory_kb: memory_usage_kb,
                judge_text: message
            },
            progress: Math.floor(c.id * 100 / ctx.config.count)
        }, c.id);
    };
}

function judgeSubtask(subtask) {
    return async ctx => {
        subtask.type = subtask.type || 'min';
        let ctx_subtask = {
            subtask, status: 0,
            score: subtask.type == 'min'
                ? subtask.score
                : 0
        };
        let cases = [];
        for (let cid in subtask.cases)
            cases.push(ctx.queue.add(() => judgeCase(subtask.cases[cid])(ctx, ctx_subtask)));
        await Promise.all(cases);
        ctx.total_status = Math.max(ctx.total_status, ctx_subtask.status);
        ctx.total_score += ctx_subtask.score;
    };
}

exports.judge = async ctx => {
    if (ctx.config.template) {
        if (ctx.config.template[ctx.lang])
            ctx.code = ctx.config.template[ctx.lang][0] + ctx.code + ctx.config.template[ctx.lang][1];
        else
            throw new CompileError('Language not supported by provided templates');
    }
    ctx.next({ status: STATUS_COMPILING });
    [ctx.execute] = await Promise.all([
        (async () => {
            let copyIn = {};
            for (let file of ctx.config.user_extra_files)
                copyIn[parseFilename(file)] = { src: file };
            return await compile(ctx.lang, ctx.code, 'code', copyIn, ctx.next);
        })(),
        (async () => {
            let copyIn = {};
            for (let file of ctx.config.judge_extra_files)
                copyIn[parseFilename(file)] = { src: file };
            return await compile_checker(
                ctx.config.checker_type || 'default',
                ctx.config.checker,
                copyIn
            );
        })()
    ]);
    ctx.clean.push(ctx.execute.clean);
    ctx.next({ status: STATUS_JUDGING, progress: 0 });
    let tasks = [];
    ctx.total_status = 0, ctx.total_score = 0, ctx.total_memory_usage_kb = 0, ctx.total_time_usage_ms = 0;
    ctx.queue = new Queue({ concurrency: ctx.config.concurrency || 2 });
    for (let sid in ctx.config.subtasks)
        tasks.push(judgeSubtask(ctx.config.subtasks[sid])(ctx));
    await Promise.all(tasks);
    ctx.stat.done = new Date();
    ctx.next({ judge_text: JSON.stringify(ctx.stat) });
    ctx.end({
        status: ctx.total_status,
        score: ctx.total_score,
        time_ms: Math.floor(ctx.total_time_usage_ms * 1000000) / 1000000,
        memory_kb: ctx.total_memory_usage_kb
    });
};
