const
    { cache_open, cache_invalidate } = require('./cache'),
    { STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR, STATUS_ACCEPTED,
        STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR,
        STATUS_IGNORED } = require('./status'),
    { CompileError, SystemError } = require('./error'),
    { max } = require('utils'),
    readCases = require('./cases'),
    path = require('path'),
    compile = require('./compile'),
    check = require('./check'),
    fs = require('fs'),
    fsp = fs.promises;

module.exports = class JudgeHandler {
    constructor(session, request, ws, sandbox) {
        this.session = session;
        this.request = request;
        this.ws = ws;
        this.sandbox = sandbox;
    }
    async handle() {
        console.log(this.request);
        if (!this.request.event) await this.do_record();
        else if (this.request.event == 'problem_data_change') await this.update_problem_data();
        else console.warn('Unknown event: %s', this.request.event);
    }
    async do_record() {
        this.tag = this.request.tag;
        this.type = this.request.type;
        this.domain_id = this.request.domain_id;
        this.pid = this.request.pid;
        this.rid = this.request.rid;
        this.lang = this.request.lang;
        this.code = this.request.code;
        try {
            if (this.type == 0) await this.do_submission();
            else if (this.type == 1) await this.do_pretest();
            else throw new SystemError(`Unsupported type: ${this.type}`);
        } catch (e) {
            if (e instanceof CompileError) {
                this.next({ judge_text: e.message });
                this.end({ status: STATUS_COMPILE_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            } else {
                console.error(e);
                this.next({ judge_text: e.message });
                this.end({ status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            }
        }
    }
    async update_problem_data() {
        let domain_id = this.request.domain_id;
        let pid = this.request.pid;
        await cache_invalidate(domain_id, pid);
        console.debug('Invalidated %s/%s', domain_id, pid);
        await this.session.update_problem_data();
    }
    async do_submission() {
        console.info('Submission: %s/%s, %s', this.domain_id, this.pid, this.rid);
        let [folder] = await Promise.all([
            cache_open(this.session, this.domain_id, this.pid),
            this.build()
        ]);
        let config = await readCases(folder);
        if (config.checker) await this.build_checker(config.checker);
        this.config = config;
        await this.judge(folder);
    }
    async do_pretest() {
        console.info('Pretest: %s/%s, %s', this.domain_id, this.pid, this.rid);
        let folder = path.join(`_/${this.rid}`);
        await Promise.all([
            this.session.record_pretest_data(this.rid, folder),
            this.build()
        ]);
        this.config = await readCases(folder);
        await this.judge(folder);
    }
    async build() {
        this.next({ status: STATUS_COMPILING });
        let { code, stdout, stderr, run_config } = await compile(this.lang, this.code, this.sandbox);
        if (code) {
            console.debug('Compile error: %s\n%s', stdout, stderr);
            throw new CompileError({ stdout, stderr });
        }
        stdout = await fsp.readFile(stdout).toString();
        stderr = await fsp.readFile(stderr).toString();
        this.next({ compiler_text: [stdout, stderr].join('\n') });
        this.run_config = run_config;
    }
    async build_checker(checker_file) {
        let checker_code = await fsp.readFile(checker_file);
        let checker_lang = checker_file.split('.')[checker_file.split('.').length - 1];
        let { code, stdout, stderr, run_config } = await compile(checker_lang, checker_code, this.sandbox);
        if (code) {
            console.debug('Checker compile error: %s\n%s', stdout, stderr);
            throw new CompileError({ stdout, stderr });
        }
        this.checker_config = run_config;
    }
    async judge() {
        this.next({ status: STATUS_JUDGING, progress: 0 });
        let total_status = 0, total_score = 0, total_memory_usage_kb = 0, total_time_usage_ms = 0;
        for (let subtask of this.config.subtasks) {
            let failed = false, subtask_score = 0;
            for (let c in subtask) {
                if (failed) {
                    this.next({
                        total_status,
                        case: {
                            status: STATUS_IGNORED, score: 0,
                            time_ms: 0, memory_kb: 0,
                            judge_text: ''
                        },
                        progress: c.id * 100 / this.config.count
                    });
                } else {
                    let { code, time_usage_ms, memory_usage_kb, stdout } = await this.sandbox.run({
                        input: c.input, time_limit_ms: subtask.time_limit_ms,
                        memory_limit_mb: subtask.memory_limit_mb
                    });
                    let status, message = '', score = 0;
                    if (code) {
                        status = STATUS_RUNTIME_ERROR;
                        message = `Your program exited with code ${code}.`;
                    } else {
                        [status, score, message] = await check(this.sandbox, {
                            input: c.input,
                            output: c.output,
                            user_ans: stdout,
                            checker: this.config.checker,
                            checker_type: this.config.checker_type,
                            score: subtask.score
                        });
                    }
                    subtask_score += score;
                    total_status = max(total_status, status);
                    total_time_usage_ms += time_usage_ms;
                    total_memory_usage_kb = max(total_memory_usage_kb, memory_usage_kb);
                    if (status != STATUS_ACCEPTED) failed = true;
                    this.next({
                        total_status,
                        case: {
                            status, score,
                            time_ms: time_usage_ms,
                            memory_kb: memory_usage_kb,
                            judge_text: message
                        },
                        progress: c.id * 100 / this.config.count
                    });
                }
            } //End: for(case)
            if (failed) total_score += subtask_score;
            else total_score += subtask.score;
        } //End: for(subtask)
        this.end({
            status: total_status,
            score: total_score,
            time_ms: total_time_usage_ms,
            memory_kb: total_memory_usage_kb
        });
    }
    next(data) {
        data.key = 'next';
        data.tag = this.tag;
        this.ws.send(JSON.stringify(data));
    }
    end(data) {
        data.key = 'end';
        data.tag = this.tag;
        this.ws.send(JSON.stringify(data));
    }
};
