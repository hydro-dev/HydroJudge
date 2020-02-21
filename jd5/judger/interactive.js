const
    { STATUS_ACCEPTED, STATUS_JUDGING, STATUS_COMPILING,
        STATUS_RUNTIME_ERROR, STATUS_SYSTEM_ERROR, STATUS_WRONG_ANSWER,
        STATUS_IGNORED, STATUS_TIME_LIMIT_EXCEEDED, STATUS_MEMORY_LIMIT_EXCEEDED } = require('../status'),
    { CompileError } = require('../error'),
    { max, parseLang, parseFilename, outputLimit } = require('../utils'),
    path = require('path'),
    signals = require('../signals'),
    compile = require('../compile'),
    pipe = require('./../../build/Release/pipe'),
    fs = require('fs'),
    closePipe = async pipe => {
        if (pipe) await Promise.all([
            new Promise(resolve => {
                fs.close(pipe.read, resolve);
            }),
            new Promise(resolve => {
                fs.close(pipe.write, resolve);
            })
        ]);
    };

async function build(next, sandbox, lang, scode) {
    let { code, stdout, stderr, execute } = await compile(lang, scode, sandbox, 'code');
    if (code) throw new CompileError({ stdout, stderr });
    else next({ compiler_text: outputLimit(stdout, stderr) });
    return execute;
}

async function build_interactor(sandbox, code_file) {
    let { code, stdout, stderr, execute } = await compile(parseLang(parseFilename(code_file)), fs.readFileSync(code_file), sandbox, 'interactor');
    if (code) throw new CompileError({ stdout, stderr });
    return execute;
}

exports.judge = async function ({ next, end, config, pool, lang, code }) {
    let [usr_sandbox, judge_sandbox] = await pool.get(2);
    let pipe1 = null, pipe2 = null;
    try {
        for (let i in config.judge_extra_files)
            config.judge_extra_files[i] = judge_sandbox.addFile(config.judge_extra_files[i]);
        await Promise.all(config.judge_extra_files);
        for (let i in config.user_extra_files)
            config.user_extra_files[i] = usr_sandbox.addFile(config.user_extra_files[i]);
        await Promise.all(config.user_extra_files);
        next({ status: STATUS_COMPILING });
        let [execute_user, execute_checker] = await Promise.all([
            build(next, usr_sandbox, lang, code),
            build_interactor(judge_sandbox, config.checker)
        ]);
        next({ status: STATUS_JUDGING, progress: 0 });
        let total_status = 0, total_score = 0, total_memory_usage_kb = 0, total_time_usage_ms = 0;
        for (let subtask of config.subtasks) {
            let failed = false;
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
                    let interactor_stderr = path.resolve(judge_sandbox.dir, 'stderr');
                    let user_stderr = path.resolve(usr_sandbox.dir, 'stderr');
                    pipe1 = pipe();
                    pipe2 = pipe();
                    let judge_promise = judge_sandbox.run(
                        execute_checker.replace('%filename%', 'interactor'),
                        {
                            stdin: pipe2.read, stdout: pipe1.write, stderr: interactor_stderr,
                            time_limit_ms: subtask.time_limit_ms * 1.2,
                            memory_limit_mb: subtask.memory_limit_mb * 1.2
                        }
                    );
                    let { code: usr_code, time_usage_ms, memory_usage_kb } = await usr_sandbox.run(
                        execute_user.replace('%filename%', 'code'),
                        {
                            stdin: pipe1.read, stdout: pipe2.write, stderr: user_stderr,
                            time_limit_ms: subtask.time_limit_ms,
                            memory_limit_mb: subtask.memory_limit_mb
                        }
                    );
                    let { code: interactor_code } = await judge_promise;
                    let status, message = '';
                    if (interactor_code) {
                        status = STATUS_SYSTEM_ERROR;
                        if (interactor_code < 32) message = signals[interactor_code];
                        else message = `Interactor exited with code ${interactor_code}.`;
                    } else if (time_usage_ms > subtask.time_limit_ms)
                        status = STATUS_TIME_LIMIT_EXCEEDED;
                    else if (memory_usage_kb > subtask.memory_limit_mb * 1024)
                        status = STATUS_MEMORY_LIMIT_EXCEEDED;
                    else if (usr_code) {
                        status = STATUS_RUNTIME_ERROR;
                        if (usr_code < 32) message = signals[usr_code];
                        else message = `Your program exited with code ${usr_code}.`;
                    } else {
                        let st = (await fs.readFile(path.resolve(judge_sandbox.dir, 'stderr'))).toString;
                        if (st == 'ok') status = STATUS_ACCEPTED;
                        else status = STATUS_WRONG_ANSWER;
                    }
                    total_status = max(total_status, status);
                    total_time_usage_ms += time_usage_ms;
                    total_memory_usage_kb = max(total_memory_usage_kb, memory_usage_kb);
                    if (status != STATUS_ACCEPTED) failed = true;
                    await Promise.all([closePipe(pipe1), closePipe(pipe2)]);
                    next({
                        status: total_status,
                        case: {
                            status,
                            score: 0,
                            time_ms: time_usage_ms,
                            memory_kb: memory_usage_kb,
                            judge_text: message
                        },
                        progress: Math.floor(c.id * 100 / config.count)
                    });
                }
            } //End: for(case)
            if (!failed) total_score += subtask.score;
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
        if (usr_sandbox) usr_sandbox.free();
        if (judge_sandbox) judge_sandbox.free();
        if (pipe1) closePipe(pipe1);
        if (pipe2) closePipe(pipe2);
        throw e;
    }
};
