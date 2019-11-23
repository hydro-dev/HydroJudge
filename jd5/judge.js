const
    cache = require('./cache'),
    { CACHE_DIR } = require('./config'),
    { STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR } = require('./status'),
    { CompileError, SystemError, FormatError } = require('./error'),
    readCases = require('./cases'),
    judger = require('./judger'),
    path = require('path'),
    log = require('./log');

const DEFAULT_LANGUAGE = require('./config').DEFAULT_LANGUAGE || 'zh-CN';

module.exports = class JudgeHandler {
    constructor(session, request, ws, pool) {
        this.session = session;
        this.request = request;
        this.host = request.host;
        this.ws = ws;
        this.pool = pool;
    }
    async handle() {
        if (!this.request.event) await this.do_record();
        else if (this.request.event == 'problem_data_change') await this.update_problem_data();
        else log.warn('Unknown event: %s', this.request.event);
    }
    async do_record() {
        this.tag = this.request.tag;
        this.type = this.request.type;
        this.domain_id = this.request.domain_id;
        this.pid = this.request.pid;
        this.rid = this.request.rid;
        this.lang = this.request.lang;
        this.code = this.request.code;
        this.language = this.request.language || DEFAULT_LANGUAGE;
        this.next = this.get_next(this.ws, this.tag);
        this.end = this.get_end(this.ws, this.tag);
        try {
            if (this.type == 0) await this.do_submission();
            else if (this.type == 1) await this.do_pretest();
            else throw new SystemError('Unsupported type: {0}'.translate(this.language).format(this.type));
        } catch (e) {
            if (e instanceof CompileError) {
                this.next({ compiler_text: e.message });
                this.end({ status: STATUS_COMPILE_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            } else if (e instanceof FormatError) {
                this.next({ judge_text: e.message.translate(this.language).format(e.params) });
                this.end({ status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            } else {
                log.error(e);
                this.next({ judge_text: e.message + '\n' + e.stack + '\n' + JSON.stringify(e.params) });
                this.end({ status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            }
        }
    }
    async update_problem_data() {
        let domain_id = this.request.domain_id;
        let pid = this.request.pid;
        await cache.invalidate(this.host, domain_id, pid);
        log.debug('Invalidated %s/%s', domain_id, pid);
        await this.session.updateProblemData();
    }
    async do_submission() {
        log.info('Submission: %s/%s/%s, %s', this.host, this.domain_id, this.pid, this.rid);
        this.folder = await cache.open(this.session, this.host, this.domain_id, this.pid);
        this.config = await readCases(this.folder, { detail: this.session.config.detail });
        await judger[this.config.type || 'default'].judge(this);
    }
    async do_pretest() {
        log.info('Pretest: %s/%s/%s, %s', this.host, this.domain_id, this.pid, this.rid);
        this.folder = path.resolve(CACHE_DIR, `_/${this.rid}`);
        await this.session.record_pretest_data(this.rid, this.folder);
        this.config = await readCases(this.folder, { detail: this.session.config.detail });
        await judger.default.judge(this);
    }
    get_next(ws, tag) {
        return data => {
            data.key = 'next';
            data.tag = tag;
            ws.send(JSON.stringify(data));
        };
    }
    get_end(ws, tag) {
        return data => {
            data.key = 'end';
            data.tag = tag;
            ws.send(JSON.stringify(data));
        };
    }
};
