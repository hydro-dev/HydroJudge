const
    { STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR,
        STATUS_TIME_LIMIT_EXCEEDED, STATUS_MEMORY_LIMIT_EXCEEDED } = require('../status'),
    { parseFilename } = require('../utils'),
    { run } = require('../sandbox'),
    log = require('../log'),
    { default: Queue } = require('p-queue'),
    compile = require('../compile'),
    signals = require('../signals'),
    fs = require('fs'),
    Score = {
        sum: (a, b) => (a + b),
        max: Math.max,
        min: Math.min
    };

function judgeCase(c) {
    return async (ctx, ctx_subtask) => {
        let code, time_usage_ms, memory_usage_kb;
        ctx.executeInteractor.copyIn.stdans = { src: c.input };
        let [resUser, resInteractor] = await run([
            {
                execute: ctx.executeUser.execute.replace(/\$\{name\}/g, 'code'),
                copyIn: ctx.executeUser.copyIn,
                time_limit_ms: ctx_subtask.subtask.time_limit_ms,
                memory_limit_mb: ctx_subtask.subtask.memory_limit_mb
            }, {
                execute: ctx.executeInteractor.execute.replace(/\$\{name\}/g, 'code'),
                copyIn: ctx.executeInteractor.copyIn,
                time_limit_ms: ctx_subtask.subtask.time_limit_ms * 2,
                memory_limit_mb: ctx_subtask.subtask.memory_limit_mb * 2
            }
        ]);
        ({ code, time_usage_ms, memory_usage_kb } = resUser);
        let status, message = '', score;
        if (time_usage_ms > ctx_subtask.subtask.time_limit_ms)
            status = STATUS_TIME_LIMIT_EXCEEDED;
        else if (memory_usage_kb > ctx_subtask.subtask.memory_limit_mb * 1024)
            status = STATUS_MEMORY_LIMIT_EXCEEDED;
        else if (code) {
            status = STATUS_RUNTIME_ERROR;
            if (code < 32) message = signals[code];
            else message = `Your program exited with code ${code}.`;
        } else[status, score, message] = resInteractor.files.stderr.split('\n');
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
        ctx.total_score += ctx_subtask.score;
    };
}

exports.judge = async ctx => {
    ctx.next({ status: STATUS_COMPILING });
    [ctx.executeUser, ctx.executeInteractor] = await Promise.all([
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
            return await compile(parseFilename(ctx.checker).split('.')[1], fs.readFileSync(ctx.checker), 'interactor', copyIn);
        })(),
    ]);
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
