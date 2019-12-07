const
    Listr = require('listr'),
    { STATUS_ACCEPTED, STATUS_JUDGING, STATUS_COMPILING,
        STATUS_RUNTIME_ERROR, STATUS_IGNORED, STATUS_TIME_LIMIT_EXCEEDED,
        STATUS_MEMORY_LIMIT_EXCEEDED } = require('../status'),
    { CompileError } = require('../error'),
    { max } = require('../utils'),
    path = require('path'),
    compile = require('../compile'),
    signals = require('../signals'),
    { check, compile_checker } = require('../check'),
    fs = require('fs'),
    fsp = fs.promises;

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
        if (ctx.failed) ctx.next({
            status: ctx.total_status,
            case: {
                status: STATUS_IGNORED,
                score: 0,
                time_ms: 0,
                memory_kb: 0,
                judge_text: ''
            },
            progress: Math.floor(c.id * 100 / ctx.config.count)
        });
        else {
            let code, time_usage_ms, memory_usage_kb;
            let stdout = path.resolve(ctx.usr_sandbox.dir, 'stdout');
            let stderr = path.resolve(ctx.usr_sandbox.dir, 'stderr');
            if (ctx.config.filename) {
                await ctx.usr_sandbox.addFile(c.input, ctx.config.filename + '.in');
                let res = await ctx.usr_sandbox.run(
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
                stdout = path.resolve(ctx.usr_sandbox.dir, 'home', ctx.config.filename + '.out');
                if (!fs.existsSync(stdout)) fs.writeFileSync(stdout, '');
            } else {
                let res = await ctx.usr_sandbox.run(
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
            let status, message = '';
            if (time_usage_ms > ctx.subtask.time_limit_ms)
                status = STATUS_TIME_LIMIT_EXCEEDED;
            else if (memory_usage_kb > ctx.subtask.memory_limit_mb * 1024)
                status = STATUS_MEMORY_LIMIT_EXCEEDED;
            else if (code) {
                status = STATUS_RUNTIME_ERROR;
                if (code < 32) message = signals[code].translate(ctx.config.language || 'zh-CN');
                else message = 'Your program exited with code {0}.'.translate(ctx.config.language || 'zh-CN').format(code);
            } else[status, , message] = await check(ctx.judge_sandbox, {
                stdin: c.input,
                stdout: c.output,
                user_stdout: stdout,
                user_stderr: stderr,
                checker: ctx.config.checker,
                checker_type: ctx.config.checker_type,
                score: ctx.subtask.score,
                detail: ctx.config.detail
            });
            ctx.total_status = max(ctx.total_status, status);
            ctx.total_time_usage_ms += time_usage_ms;
            ctx.total_memory_usage_kb = max(ctx.total_memory_usage_kb, memory_usage_kb);
            if (status != STATUS_ACCEPTED) ctx.failed = true;
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
        }
    };
}

function judgeSubtask(subtask) {
    return ctx => {
        let tasks = [{
            title: 'Prepare',
            task: ctx => {
                ctx.failed = false;
                ctx.subtask = subtask;
            }
        }];
        for (let cid in subtask.cases)
            tasks.push({
                title: `Case ${cid}`,
                task: judgeCase(subtask.cases[cid])
            });
        tasks.push({
            title: 'Caculating score',
            task: () => {
                if (!ctx.failed) ctx.total_score += ctx.subtask.score;
            }
        });
        return new Listr(tasks);
    };
}

exports.judge = () => [{
    title: 'Preparing sandbox',
    task: async ctx => {
        [ctx.usr_sandbox, ctx.judge_sandbox] = await Promise.all([ctx.pool.get(), ctx.pool.get()]);
        for (let i in ctx.config.judge_extra_files)
            ctx.config.judge_extra_files[i] = ctx.judge_sandbox.addFile(ctx.config.judge_extra_files[i]);
        await Promise.all(ctx.config.judge_extra_files);
        for (let i in ctx.config.user_extra_files)
            ctx.config.user_extra_files[i] = ctx.usr_sandbox.addFile(ctx.config.user_extra_files[i]);
        await Promise.all(ctx.config.user_extra_files);
    }
},
{
    title: 'Compiling',
    task: async ctx => {
        ctx.next({ status: STATUS_COMPILING });
        let exit_code, message;
        [ctx.execute, [exit_code, message]] = await Promise.all([
            build(ctx.next, ctx.usr_sandbox, ctx.lang, ctx.code),
            compile_checker(ctx.judge_sandbox, ctx.config.checker_type || 'default', ctx.config.checker)
        ]);
        if (exit_code) throw new CompileError({ stdout: 'Checker compile failed:', stderr: message });
    }
},
{
    title: 'Judging',
    task: ctx => {
        ctx.next({ status: STATUS_JUDGING, progress: 0 });
        let tasks = [];
        ctx.total_status = 0, ctx.total_score = 0, ctx.total_memory_usage_kb = 0, ctx.total_time_usage_ms = 0;
        for (let sid in ctx.config.subtasks)
            tasks.push({
                title: `Subtask ${sid}`,
                task: judgeSubtask(ctx.config.subtasks[sid])
            });
        return new Listr(tasks);
    }
},
{
    title: 'Finish',
    task: (ctx) => Promise.all([
        ctx.end({
            status: ctx.total_status,
            score: ctx.total_score,
            time_ms: ctx.total_time_usage_ms,
            memory_kb: ctx.total_memory_usage_kb
        }),
        ctx.usr_sandbox.free(),
        ctx.judge_sandbox.free()
    ])
}];