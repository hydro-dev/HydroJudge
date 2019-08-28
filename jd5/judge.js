const
    { cache_open, cache_invalidate } = require('./cache'),
    { STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR,
        STATUS_JUDGING, STATUS_COMPILING, STATUS_RUNTIME_ERROR } = require('./status'),
    { CompileError } = require('./error'),
    { max } = require('utils'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    compile = require('./compile'),
    restrict = path => {
        if (path[0] == '/') path = '';
        return path.replace(/\.\./i, '');
    };

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
            else throw new Error(`Unsupported type: ${this.type}`);
        } catch (e) {
            if (e instanceof CompileError)
                this.end({ status: STATUS_COMPILE_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            else {
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
        let [file] = await Promise.all([
            await cache_open(this.session, this.domain_id, this.pid),
            await this.build()
        ]);
        await this.judge(file);
    }
    async do_pretest() {
        console.info('Pretest: %s/%s, %s', this.domain_id, this.pid, this.rid);
        let file_path = path.join(`_/${this.rid}`);
        await Promise.all([
            this.session.record_pretest_data(this.rid, file_path),
            await this.build()
        ]);
        await this.judge(file_path);
    }
    async build() {
        this.next({ status: STATUS_COMPILING });
        let [status, message, run_config] = await compile(this.lang, this.code, this.sandbox);
        this.next({ compiler_text: message });
        this.run_config = run_config;
        if (status) {
            console.debug('Compile error: %s', message);
            throw new CompileError(message);
        }
    }
    async judge_ini(folder) {
        let config_file = (await fsp.readFile(path.resolve(folder, 'config.ini'))).toString();
        config_file = config_file.split('\n');
        let count = parseInt(config_file[0]), total_status = 0, total_score = 0,
            total_memory_usage_bytes = 0, total_time_usage_ns = 0;
        for (let i = 1; i <= count; i++) {
            let line = config_file[i].split('|');
            await fsp.copyFile(
                path.resolve(folder + restrict(line[0])),
                path.resolve(this.sandbox.dir, 'stdin')
            );
            let result = await this.sandbox.run({
                time_limit_ms: line[2] * 1000,
                memory_limit_mb: line[4] / 1024,
                config: this.run_config
            });
            if (!result) {
                let status = STATUS_SYSTEM_ERROR;
                total_status = max(total_status, status);
                this.next({
                    status: total_status, progress: i * 100 / count,
                    case: { status, score: 0, time_ms: 0, memory_kb: 0, judge_text: '' }
                });
            } else if (result.code != 0) {
                let status = STATUS_RUNTIME_ERROR;
                total_status = max(total_status, status);
                total_time_usage_ns += result.time_usage_ns;
                total_memory_usage_bytes = max(total_memory_usage_bytes, result.memory_usage_bytes);
                this.next({
                    status: total_status, progress: i * 100 / count,
                    case: {
                        status, score: 0,
                        time_ms: result.time_usage_ns / 1000000,
                        memory_kb: result.memory_usage_bytes / 1024,
                        judge_text: 'Exit code: ' + result.code
                    }
                });
            } else {
                let [status, score, message] = await this.check({
                    input: path.resolve(this.sandbox.dir, 'stdin'),
                    output: path.resolve(this.sandbox.dir, 'stdout'),
                    stderr: path.resolve(this.sandbox.dir, 'stderr'),
                    ans: path.resolve(folder + restrict(line[1])),
                    type: 'builtin',
                    score: parseInt(line[3])
                });
                total_status = max(total_status, status);
                total_score += score;
                total_time_usage_ns += result.time_usage_ns;
                total_memory_usage_bytes = max(total_memory_usage_bytes, result.memory_usage_bytes);
                this.next({
                    total_status,
                    case: {
                        status, score,
                        time_ms: result.time_usage_ns / 1000000,
                        memory_kb: result.memory_usage_bytes / 1024,
                        judge_text: message
                    },
                    progress: i * 100 / count
                });
            }
        }
        this.end({
            status: total_status,
            score: total_score,
            time_ms: Math.floor(total_time_usage_ns / 1000000),
            memory_kb: Math.floor(total_memory_usage_bytes / 1024)
        });
    }
    async judge_yaml(folder) {

    }
    async judge_auto(folder) {

    }
    async judge(folder) {
        this.next({ status: STATUS_JUDGING, progress: 0 });
        if (fs.existsSync(path.resolve(folder, 'config.ini'))) return this.judge_ini(folder);
        else if (fs.existsSync(path.resolve(folder, 'config.yaml'))) return this.judge_yaml(folder);
        else return this.judge_auto(folder);
    }
    next(data) {
        this.ws.send(JSON.stringify(Object.assign({ key: 'next', 'tag': this.tag }, data)));
    }
    end(data) {
        this.ws.send(JSON.stringify(Object.assign({ key: 'end', 'tag': this.tag }, data)));
    }
};