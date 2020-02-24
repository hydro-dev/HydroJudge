const
    { STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR,
        STATUS_TIME_LIMIT_EXCEEDED, STATUS_MEMORY_LIMIT_EXCEEDED,
        STATUS_ACCEPTED } = require('../status'),
    { CompileError } = require('../error'),
    { copyFolder, outputLimit } = require('../utils'),
    path = require('path'),
    compile = require('../compile'),
    signals = require('../signals'),
    fs = require('fs');

async function build(next, sandbox, lang, scode) {
    let { code, stdout, stderr, execute } = await compile(lang, scode, sandbox, 'code');
    if (code) throw new CompileError({ stdout, stderr });
    next({ compiler_text: outputLimit(stdout, stderr) });
    return execute;
}

exports.judge = async ctx => {
    ctx.next({ status: STATUS_COMPILING });
    let exit_code, sandbox;
    try {
        [sandbox] = await ctx.pool.get();
        ctx.execute = await build(ctx.next, sandbox, ctx.lang, ctx.code);
        await copyFolder(path.resolve(sandbox.dir, 'home'), path.resolve(ctx.tmpdir, 'compile'));
        if (exit_code) throw new CompileError({ stdout: 'Checker compile failed:', stderr: message });
        ctx.next({ status: STATUS_JUDGING, progress: 0 });
        let sandbox, code, time_usage_ms, memory_usage_kb, filename = ctx.config.filename;
        let files = [copyFolder(path.resolve(ctx.tmpdir, 'compile'), path.resolve(sandbox.dir, 'home'))];
        for (let file of ctx.config.user_extra_files)
            files.push(sandbox.addFile(file));
        if (ctx.config.filename) files.push(sandbox.addFile(ctx.config.input, `${filename}.in`));
        await Promise.all(files);
        let target_stdout = filename ? path.resolve(sandbox.dir, 'home', `${filename}.out`) : path.resolve(sandbox.dir, 'stdout');
        let stderr = path.resolve(sandbox.dir, 'stderr');
        let stdin = filename ? '/dev/null' : (fs.existsSync(ctx.config.input) ? ctx.config.input : '/dev/null');
        let stdout = filename ? '/dev/null' : target_stdout;
        let res = await sandbox.run(
            ctx.execute.replace('%filename%', 'code'),
            {
                stdin, stdout, stderr,
                time_limit_ms: ctx.config.time_limit_ms,
                memory_limit_mb: ctx.config.memory_limit_mb
            }
        );
        ({ code, time_usage_ms, memory_usage_kb } = res);
        if (!fs.existsSync(target_stdout)) fs.writeFileSync(target_stdout, '');
        let status, message = '';
        if (time_usage_ms > ctx.config.time_limit_ms)
            status = STATUS_TIME_LIMIT_EXCEEDED;
        else if (memory_usage_kb > ctx.config.memory_limit_mb * 1024)
            status = STATUS_MEMORY_LIMIT_EXCEEDED;
        else if (code) {
            status = STATUS_RUNTIME_ERROR;
            if (code < 32) message = signals[code];
            else message = `Your program exited with code ${code}.`;
        } else {
            status = STATUS_ACCEPTED;
            message = outputLimit(target_stdout, stderr);
        }
        ctx.total_time_usage_ms = time_usage_ms;
        ctx.total_memory_usage_kb = memory_usage_kb;
        ctx.next({
            status: STATUS_JUDGING,
            case: {
                status,
                score: 0,
                time_ms: time_usage_ms,
                memory_kb: memory_usage_kb,
                judge_text: message
            },
            progress: 100
        });
    } finally {
        if (sandbox) sandbox.free();
    }
    ctx.stat.done = new Date();
    ctx.next({ judge_text: JSON.stringify(ctx.stat) });
    ctx.end({
        status: ctx.total_status,
        score: ctx.total_score,
        time_ms: ctx.total_time_usage_ms,
        memory_kb: ctx.total_memory_usage_kb
    });
};
