const fs = require('fs-extra');
const path = require('path');
const {
    STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR,
    STATUS_TIME_LIMIT_EXCEEDED, STATUS_MEMORY_LIMIT_EXCEEDED,
    STATUS_ACCEPTED,
} = require('../status');
const { run } = require('../sandbox');
const compile = require('../compile');
const signals = require('../signals');

exports.judge = async (ctx) => {
    ctx.stat.judge = new Date();
    ctx.next({ status: STATUS_COMPILING });
    ctx.execute = await compile(ctx.lang, ctx.code, 'code', {}, ctx.next);
    ctx.clean.push(ctx.execute.clean);
    ctx.next({ status: STATUS_JUDGING, progress: 0 });
    const { copyIn } = ctx.execute;
    const stdin = path.resolve(ctx.tmpdir, 'stdin');
    const stdout = path.resolve(ctx.tmpdir, 'stdout');
    const stderr = path.resolve(ctx.tmpdir, 'stderr');
    fs.writeFileSync(stdin, ctx.config.input || '');
    const res = await run(
        ctx.execute.execute.replace(/\$\{name\}/g, 'code'),
        {
            stdin,
            stdout,
            stderr,
            copyIn,
            time_limit_ms: ctx.config.time,
            memory_limit_mb: ctx.config.memory,
        },
    );
    const { code, time_usage_ms, memory_usage_kb } = res;
    let { status } = res;
    if (!fs.existsSync(stdout)) fs.writeFileSync(stdout, '');
    let message = '';
    if (status === STATUS_ACCEPTED) {
        if (time_usage_ms > ctx.config.time) {
            status = STATUS_TIME_LIMIT_EXCEEDED;
        } else if (memory_usage_kb > ctx.config.memory * 1024) {
            status = STATUS_MEMORY_LIMIT_EXCEEDED;
        }
    } else if (code) {
        status = STATUS_RUNTIME_ERROR;
        if (code < 32) message = signals[code];
        else message = `您的程序返回了 ${code}.`;
    }
    ctx.next({
        status,
        case: {
            status,
            time_ms: time_usage_ms,
            memory_kb: memory_usage_kb,
            judge_text: message,
        },
    });
    ctx.stat.done = new Date();
    ctx.next({ judge_text: JSON.stringify(ctx.stat) });
    ctx.end({
        status,
        score: status === STATUS_ACCEPTED ? 100 : 0,
        stdout: fs.readFileSync(stdout).toString(),
        stderr: fs.readFileSync(stderr).toString(),
        time_ms: Math.floor(time_usage_ms * 1000000) / 1000000,
        memory_kb: memory_usage_kb,
    });
};
