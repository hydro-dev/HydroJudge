const
    { STATUS_ACCEPTED, STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR, STATUS_IGNORED } = require('../status'),
    { CompileError } = require('../error'),
    { max } = require('../utils'),
    path = require('path'),
    compile = require('../compile'),
    { check, compile_checker } = require('../check'),
    fs = require('fs'),
    fsp = fs.promises;

async function build(next, sandbox, lang, scode) {
    let { code, stdout, stderr, execute } = await compile(lang, scode, sandbox, 'code');
    if (code) throw new CompileError({ stdout, stderr });
    stdout = (await fsp.readFile(stdout)).toString();
    stderr = (await fsp.readFile(stderr)).toString();
    next({ compiler_text: [stdout, stderr, '自豪的采用jd5进行评测'].join('\n') });
    return execute;
}

exports.judge = async function ({ folder, next, end, config, pool, lang, code }) {
    let [usr_sandbox, judge_sandbox] = await Promise.all([pool.get(), pool.get()]);
    try {
        for (let i in config.judge_extra_files)
            config.judge_extra_files[i] = judge_sandbox.addFile(config.judge_extra_files[i]);
        await Promise.all(config.judge_extra_files);
        for (let i in config.user_extra_files)
            config.user_extra_files[i] = usr_sandbox.addFile(config.user_extra_files[i]);
        await Promise.all(config.user_extra_files);
        next({ status: STATUS_COMPILING });
        let [execute, [exit_code, message]] = await Promise.all([
            build(next, usr_sandbox, lang, code),
            compile_checker(judge_sandbox, config.checker_type || 'default', config.checker)
        ]);
        if (exit_code) throw new CompileError({ stdout: 'Checker compile failed:', stderr: message });
        next({ status: STATUS_JUDGING, progress: 0 });
        let total_status = 0, total_score = 0, total_memory_usage_kb = 0, total_time_usage_ms = 0;
        for (let subtask of config.subtasks) {
            let failed = false, subtask_score = 0;
            for (let c of subtask.cases) {
                if (failed) next({
                    status: total_status,
                    case: {
                        status: STATUS_IGNORED,
                        score: 0,
                        time_ms: 0,
                        memory_kb: 0,
                        judge_text: ''
                    },
                    progress: Math.floor(c.id * 100 / config.count)
                });
                else {
                    let stdout = path.resolve(usr_sandbox.dir, 'stdout');
                    let stderr = path.resolve(usr_sandbox.dir, 'stderr');
                    let { code, time_usage_ms, memory_usage_kb } = await usr_sandbox.run(
                        execute.replace('%filename%', 'code'),
                        {
                            stdin: c.input, stdout, stderr,
                            time_limit_ms: subtask.time_limit_ms,
                            memory_limit_mb: subtask.memory_limit_mb
                        }
                    );
                    let status, message = '', score = 0;
                    if (code) {
                        status = STATUS_RUNTIME_ERROR;
                        message = 'Your program exited with code {0}.'.translate(config.language || 'zh-CN').format(code);
                    } else[status, score, message] = await check(judge_sandbox, {
                        stdin: c.input,
                        stdout: c.output,
                        user_stdout: stdout,
                        user_stderr: stderr,
                        checker: config.checker,
                        checker_type: config.checker_type,
                        score: subtask.score
                    });
                    subtask_score += score;
                    total_status = max(total_status, status);
                    total_time_usage_ms += time_usage_ms;
                    total_memory_usage_kb = max(total_memory_usage_kb, memory_usage_kb);
                    if (status != STATUS_ACCEPTED) failed = true;
                    next({
                        status: total_status,
                        case: {
                            status,
                            score,
                            time_ms: time_usage_ms,
                            memory_kb: memory_usage_kb,
                            judge_text: message
                        },
                        progress: Math.floor(c.id * 100 / config.count)
                    });
                }
            } //End: for(case)
            if (failed) total_score += subtask_score;
            else total_score += subtask.score;
        } //End: for(subtask)
        await Promise.all([
            end({
                status: total_status,
                score: total_score,
                time_ms: total_time_usage_ms,
                memory_kb: total_memory_usage_kb
            }),
            usr_sandbox.free(),
            judge_sandbox.free()
        ]);
    } catch (e) {
        await Promise.all([
            usr_sandbox.free(), judge_sandbox.free()
        ]);
        throw e;
    }
};
