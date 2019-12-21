const
    { STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR,
        STATUS_TIME_LIMIT_EXCEEDED, STATUS_MEMORY_LIMIT_EXCEEDED } = require('../status'),
    { CompileError } = require('../error'),
    { max, copyFolder } = require('../utils'),
    path = require('path'),
    compile = require('../compile'),
    signals = require('../signals'),
    log = require('../log'),
    { check, compile_checker } = require('../check'),
    fs = require('fs'),
    fsp = fs.promises;

Math.sum=(a,b)=>(a+b);

async function build(next, sandbox, lang, scode) {
    let { code, stdout, stderr, execute } = await compile(lang, scode, sandbox, 'code');
    if (code) throw new CompileError({ stdout, stderr });
    let len = fs.statSync(stdout).size + fs.statSync(stderr).size;
    if (len <= 4096) {
        stdout = (await fsp.readFile(stdout)).toString();
        stderr = (await fsp.readFile(stderr)).toString();
        next({ compiler_text: [stdout, stderr, '自豪地采用[jd5](https://github.com/masnn/jd5)进行评测'].join('\n') });
    } else next({ compiler_text: 'Compiler output limit exceeded.' });
    return execute;
}

function judgeCase(c) {
    return async ctx => {
        let sandbox, code, time_usage_ms, memory_usage_kb, stdout, stderr;
        try {
            sandbox = await ctx.pool.get();
            let files = [copyFolder(path.resolve(ctx.tmpdir, 'compile'), path.resolve(sandbox.dir, 'home'))];
            for (let file of ctx.config.user_extra_files)
                files.push(sandbox.addFile(file));
            await Promise.all(files);
            stdout = path.resolve(sandbox.dir, 'stdout');
            stderr = path.resolve(sandbox.dir, 'stderr');
            if (ctx.config.filename) {
                await sandbox.addFile(c.input, ctx.config.filename + '.in');
                let res = await sandbox.run(
                    ctx.execute.replace('%filename%', 'code'),
                    {
                        stdin: '/dev/null', stdout: '/dev/null', stderr,
                        time_limit_ms: ctx.subtask.time_limit_ms,
                        memory_limit_mb: ctx.subtask.memory_limit_mb
                    }
                );
                code = res.code;
                time_usage_ms = res.time_usage_ms;
                memory_usage_kb = res.memory_usage_kb;
                stdout = path.resolve(sandbox.dir, 'home', ctx.config.filename + '.out');
                if (!fs.existsSync(stdout)) fs.writeFileSync(stdout, '');
            } else {
                let res = await sandbox.run(
                    ctx.execute.replace('%filename%', 'code'),
                    {
                        stdin: c.input, stdout, stderr,
                        time_limit_ms: ctx.subtask.time_limit_ms,
                        memory_limit_mb: ctx.subtask.memory_limit_mb
                    }
                );
                code = res.code;
                time_usage_ms = res.time_usage_ms;
                memory_usage_kb = res.memory_usage_kb;
            }
            files = [copyFolder(path.resolve(ctx.tmpdir, 'checker'), path.resolve(sandbox.dir, 'home'))];
            for (let file of ctx.config.judge_extra_files)
                files.push(sandbox.addFile(file));
            await Promise.all(files);
            let status, message = '', score;
            if (time_usage_ms > ctx.subtask.time_limit_ms)
                status = STATUS_TIME_LIMIT_EXCEEDED;
            else if (memory_usage_kb > ctx.subtask.memory_limit_mb * 1024)
                status = STATUS_MEMORY_LIMIT_EXCEEDED;
            else if (code) {
                status = STATUS_RUNTIME_ERROR;
                if (code < 32) message = signals[code].translate(ctx.config.language || 'zh-CN');
                else message = 'Your program exited with code {0}.'.translate(ctx.config.language || 'zh-CN').format(code);
            } else[status, score, message] = await check(sandbox, {
                stdin: c.input,
                stdout: c.output,
                user_stdout: stdout,
                user_stderr: stderr,
                checker: ctx.config.checker,
                checker_type: ctx.config.checker_type,
                score: ctx.subtask.score,
                detail: ctx.config.detail
            });
            ctx.subtask_score = Math[ctx.subtask.type](ctx.subtask_score, score);
            ctx.total_status = max(ctx.total_status, status);
            ctx.total_time_usage_ms += time_usage_ms;
            ctx.total_memory_usage_kb = max(ctx.total_memory_usage_kb, memory_usage_kb);
            log.submission(`${ctx.host}/${ctx.domain_id}/${ctx.rid}`, log.ACTION_INCREASE);
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
        } finally {
            if (sandbox) sandbox.free();
        }
    };
}

function judgeSubtask(subtask) {
    return async ctx => {
        ctx.subtask = subtask;
        ctx.subtask.type = ctx.subtask.type || 'min';
        ctx.subtask_score = 0;
        let cases = [];
        for (let cid in subtask.cases)
            cases.push(judgeCase(subtask.cases[cid])(ctx));
        await Promise.all(cases);
        ctx.total_score += ctx.subtask.score;
    };
}

exports.judge = async ctx => {
    ctx.next({ status: STATUS_COMPILING });
    let exit_code, message;
    [ctx.execute, [exit_code, message]] = await Promise.all([
        (async () => {
            let sandbox, res;
            try {
                sandbox = await ctx.pool.get();
                res = await build(ctx.next, sandbox, ctx.lang, ctx.code);
                await copyFolder(path.resolve(sandbox.dir, 'home'), path.resolve(ctx.tmpdir, 'compile'));
            } finally {
                if (sandbox) sandbox.free();
            }
            return res;
        })(),
        (async () => {
            let sandbox, res;
            try {
                sandbox = await ctx.pool.get();
                res = await compile_checker(ctx.judge_sandbox, ctx.config.checker_type || 'default', ctx.config.checker);
                await copyFolder(path.resolve(sandbox.dir, 'home'), path.resolve(ctx.tmpdir, 'checker'));
            } finally {
                if (sandbox) sandbox.free();
            }
            return res;
        })(),
    ]);
    if (exit_code) throw new CompileError({ stdout: 'Checker compile failed:', stderr: message });
    ctx.next({ status: STATUS_JUDGING, progress: 0 });
    let tasks = [];
    ctx.total_status = 0, ctx.total_score = 0, ctx.total_memory_usage_kb = 0, ctx.total_time_usage_ms = 0;
    for (let sid in ctx.config.subtasks)
        tasks.push(judgeSubtask(ctx.config.subtasks[sid])(ctx));
    await Promise.all(tasks);
    ctx.end({
        status: ctx.total_status,
        score: ctx.total_score,
        time_ms: ctx.total_time_usage_ms,
        memory_kb: ctx.total_memory_usage_kb
    });
};
