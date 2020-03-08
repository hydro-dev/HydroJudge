const
    { STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR,
        STATUS_TIME_LIMIT_EXCEEDED, STATUS_MEMORY_LIMIT_EXCEEDED,
        STATUS_ACCEPTED } = require('../status'),
    { CompileError } = require('../error'),
    { copyInDir, mkdirp } = require('../utils'),
    run = require('../run'),
    log = require('../log'),
    { default: Queue } = require('p-queue'),
    path = require('path'),
    compile = require('../compile'),
    signals = require('../signals'),
    { check, compile_checker, parseFilename } = require('../check'),
    fs = require('fs'),
    Score = {
        sum: (a, b) => (a + b),
        max: Math.max,
        min: Math.min
    };

function judgeCase(c) {
    return async (ctx, ctx_subtask) => {
        let code, time_usage_ms, memory_usage_kb, filename = ctx.config.filename;
        let copyIn = copyInDir(path.resolve(ctx.tmpdir, 'main'));
        if (ctx.config.filename) copyIn[`${filename}.in`] = { src: c.input };
        let copyOutDir = path.resolve(ctx.tmpdir, c.id.toString());
        let target_stdout = filename
            ? path.resolve(copyOutDir, `${filename}.out`)
            : path.resolve(ctx.tmpdir, `${c.id}.out`);
        let stdin = filename ? null : c.input;
        let stdout = filename ? null : target_stdout;
        let stderr = path.resolve(ctx.tmpdir, `${c.id}.err`);
        let res = await run(
            ctx.execute.replace(/\$\{name\}/g, 'code'),
            {
                stdin, stdout, stderr, copyIn, copyOutDir,
                time_limit_ms: ctx_subtask.subtask.time_limit_ms,
                memory_limit_mb: ctx_subtask.subtask.memory_limit_mb
            }
        );
        ({ code, time_usage_ms, memory_usage_kb } = res);
        if (!fs.existsSync(target_stdout)) {
            mkdirp(path.dirname(target_stdout));
            fs.writeFileSync(target_stdout, '');
        }
        let status, message = '', score;
        if (time_usage_ms > ctx_subtask.subtask.time_limit_ms)
            status = STATUS_TIME_LIMIT_EXCEEDED;
        else if (memory_usage_kb > ctx_subtask.subtask.memory_limit_mb * 1024)
            status = STATUS_MEMORY_LIMIT_EXCEEDED;
        else if (code) {
            status = STATUS_RUNTIME_ERROR;
            if (code < 32) message = signals[code];
            else message = `Your program exited with code ${code}.`;
        } else[status, score, message] = await check({
            copyIn: copyInDir(path.resolve(ctx.tmpdir, 'checker')),
            stdin: c.input,
            stdout: c.output,
            user_stdout: target_stdout,
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
        });
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
        if (ctx_subtask.status == STATUS_ACCEPTED) ctx.total_score += ctx_subtask.score;
    };
}

exports.judge = async ctx => {
    ctx.next({ status: STATUS_COMPILING });
    let exit_code, message;
    [ctx.execute, [exit_code, message]] = await Promise.all([
        (async () => {
            let copyIn = {};
            for (let file of ctx.config.user_extra_files)
                copyIn[parseFilename(file)] = { src: file };
            return await compile(ctx.lang, ctx.code, path.resolve(ctx.tmpdir, 'main'), 'code', copyIn, ctx.next);
        })(),
        (async () => {
            let copyIn = {};
            for (let file of ctx.config.judge_extra_files)
                copyIn[parseFilename(file)] = { src: file };
            return await compile_checker(
                path.resolve(ctx.tmpdir, 'checker'),
                ctx.config.checker_type || 'default',
                ctx.config.checker,
                copyIn
            );
        })()
    ]);
    if (exit_code) throw new CompileError({ stdout: 'Checker compile failed:', stderr: message });
    ctx.next({ status: STATUS_JUDGING, progress: 0 });
    let tasks = [];
    ctx.total_status = 0, ctx.total_score = 0, ctx.total_memory_usage_kb = 0, ctx.total_time_usage_ms = 0;
    ctx.queue = new Queue({ concurrency: ctx.config.concurrency || 2 });
    for (let sid in ctx.config.subtasks)
        tasks.push(judgeSubtask(ctx.config.subtasks[sid])(ctx));
    await Promise.all(tasks);
    ctx.stat.done = new Date();
    ctx.next({ judge_text: JSON.stringify(ctx.stat) });
    log.log({
        status: ctx.total_status,
        score: ctx.total_score,
        time_ms: ctx.total_time_usage_ms,
        memory_kb: ctx.total_memory_usage_kb
    });
    ctx.end({
        status: ctx.total_status,
        score: ctx.total_score,
        time_ms: ctx.total_time_usage_ms,
        memory_kb: ctx.total_memory_usage_kb
    });
};
