const { default: Queue } = require('p-queue');
const path = require('path');
const fs = require('fs');
const {
    STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR,
    STATUS_TIME_LIMIT_EXCEEDED, STATUS_MEMORY_LIMIT_EXCEEDED,
    STATUS_ACCEPTED,
} = require('../status');
const { CompileError } = require('../error');
const { copyInDir, parseFilename } = require('../utils');
const { run } = require('../sandbox');
const compile = require('../compile');
const signals = require('../signals');
const { check, compileChecker } = require('../check');

const Score = {
    sum: (a, b) => (a + b),
    max: Math.max,
    min: Math.min,
};

function judgeCase(c) {
    return async (ctx, ctxSubtask) => {
        const { filename } = ctx.config;
        const { copyIn } = ctx.execute;
        if (ctx.config.filename) copyIn[`${filename}.in`] = { src: c.input };
        const copyOut = filename ? [`${filename}.out`] : [];
        const stdin = filename ? null : c.input;
        const stdout = path.resolve(ctx.tmpdir, `${c.id}.out`);
        const stderr = path.resolve(ctx.tmpdir, `${c.id}.err`);
        const res = await run(
            ctx.execute.execute.replace(/\$\{name\}/g, 'code'),
            {
                stdin,
                stdout: filename ? null : stdout,
                stderr,
                copyIn,
                copyOut,
                time_limit_ms: ctxSubtask.subtask.time_limit_ms,
                memory_limit_mb: ctxSubtask.subtask.memory_limit_mb,
            },
        );
        const { code, time_usage_ms, memory_usage_kb } = res;
        let { status } = res;
        if (res.files[`${filename}.out`] || !fs.existsSync(stdout)) {
            fs.writeFileSync(stdout, res.files[`${filename}.out`] || '');
        }
        let message = '';
        let score = 0;
        if (status === STATUS_ACCEPTED) {
            if (time_usage_ms > ctxSubtask.subtask.time_limit_ms) {
                status = STATUS_TIME_LIMIT_EXCEEDED;
            } else if (memory_usage_kb > ctxSubtask.subtask.memory_limit_mb * 1024) {
                status = STATUS_MEMORY_LIMIT_EXCEEDED;
            } else {
                [status, score, message] = await check({
                    copyIn: copyInDir(path.resolve(ctx.tmpdir, 'checker')),
                    stdin: c.input,
                    stdout: c.output,
                    user_stdout: stdout,
                    user_stderr: stderr,
                    checker: ctx.config.checker,
                    checker_type: ctx.config.checker_type,
                    score: ctxSubtask.subtask.score,
                    detail: ctx.config.detail,
                });
            }
        } else if (code) {
            status = STATUS_RUNTIME_ERROR;
            if (code < 32) message = signals[code];
            else message = `您的程序返回了 ${code}.`;
        }
        ctxSubtask.score = Score[ctxSubtask.subtask.type](ctxSubtask.score, score);
        ctxSubtask.status = Math.max(ctxSubtask.status, status);
        ctx.total_time_usage_ms += time_usage_ms;
        ctx.total_memory_usage_kb = Math.max(ctx.total_memory_usage_kb, memory_usage_kb);
        ctx.next({
            status: STATUS_JUDGING,
            case: {
                status,
                score: 0,
                time_ms: time_usage_ms,
                memory_kb: memory_usage_kb,
                judge_text: message,
            },
            progress: Math.floor((c.id * 100) / ctx.config.count),
        }, c.id);
    };
}

function judgeSubtask(subtask) {
    return async (ctx) => {
        subtask.type = subtask.type || 'min';
        const ctxSubtask = {
            subtask,
            status: 0,
            score: subtask.type === 'min'
                ? subtask.score
                : 0,
        };
        const cases = [];
        for (const cid in subtask.cases) {
            cases.push(ctx.queue.add(() => judgeCase(subtask.cases[cid])(ctx, ctxSubtask)));
        }
        await Promise.all(cases);
        ctx.total_status = Math.max(ctx.total_status, ctxSubtask.status);
        ctx.total_score += ctxSubtask.score;
    };
}

exports.judge = async (ctx) => {
    if (ctx.config.template) {
        if (ctx.config.template[ctx.lang]) {
            const tpl = ctx.config.template[ctx.lang];
            ctx.code = tpl[0] + ctx.code + tpl[1];
        } else throw new CompileError('Language not supported by provided templates');
    }
    ctx.next({ status: STATUS_COMPILING });
    [ctx.execute] = await Promise.all([
        (async () => {
            const copyIn = {};
            for (const file of ctx.config.user_extra_files) {
                copyIn[parseFilename(file)] = { src: file };
            }
            return await compile(ctx.lang, ctx.code, 'code', copyIn, ctx.next);
        })(),
        (async () => {
            const copyIn = {};
            for (const file of ctx.config.judge_extra_files) {
                copyIn[parseFilename(file)] = { src: file };
            }
            return await compileChecker(
                ctx.config.checker_type || 'default',
                ctx.config.checker,
                copyIn,
            );
        })(),
    ]);
    ctx.clean.push(ctx.execute.clean);
    ctx.next({ status: STATUS_JUDGING, progress: 0 });
    const tasks = [];
    ctx.total_status = 0;
    ctx.total_score = 0;
    ctx.total_memory_usage_kb = 0;
    ctx.total_time_usage_ms = 0;
    ctx.queue = new Queue({ concurrency: ctx.config.concurrency || 2 });
    for (const sid in ctx.config.subtasks) tasks.push(judgeSubtask(ctx.config.subtasks[sid])(ctx));
    await Promise.all(tasks);
    ctx.stat.done = new Date();
    ctx.next({ judge_text: JSON.stringify(ctx.stat) });
    ctx.end({
        status: ctx.total_status,
        score: ctx.total_score,
        time_ms: Math.floor(ctx.total_time_usage_ms * 1000000) / 1000000,
        memory_kb: ctx.total_memory_usage_kb,
    });
};
