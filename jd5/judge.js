const
    List = require('./list'),
    { CACHE_DIR } = require('./config'),
    { STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR } = require('./status'),
    { CompileError, SystemError, FormatError } = require('./error'),
    readCases = require('./cases'),
    judger = require('./judger'),
    path = require('path'),
    cache = require('./cache'),
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
    do_submission() {
        return (new List([{
            title: `Submission ${this.host}/${this.domain_id}/${this.pid}/${this.rid}`,
            task: () => new List([{
                title: 'Fetch problem data',
                task: async ctx => {
                    ctx.folder = await cache.open(this.session, this.host, this.domain_id, this.pid);
                    ctx.config = await readCases(ctx.folder, { detail: this.session.config.detail });
                }
            },
            {
                title: 'Judging',
                task: ctx => {
                    ctx.lang = this.lang;
                    ctx.code = this.code;
                    ctx.next = this.next;
                    ctx.end = this.end;
                    ctx.pool = this.pool;
                    let judge = judger[ctx.config.type || 'default'].judge(this);
                    if (judge instanceof Promise) return judge;
                    return new List(judge);
                }
            }])
        }]).run());
    }
    async do_pretest() {
        return (new List([{
            title: `Pretest ${this.host}/${this.domain_id}/${this.rid}`,
            task: () => new List([{
                title: 'Fetch problem data',
                task: async ctx => {
                    ctx.folder = path.resolve(CACHE_DIR, this.host, `_/${this.rid}`);
                    await this.session.record_pretest_data(this.rid, this.folder);
                    ctx.config = await readCases(ctx.folder, { detail: this.session.config.detail });
                }
            },
            {
                title: 'Judging',
                task: ctx => {
                    ctx.lang = this.lang;
                    ctx.code = this.code;
                    ctx.next = this.next;
                    ctx.end = this.end;
                    ctx.pool = this.pool;
                    let judge = judger[ctx.config.type || 'default'].judge(this);
                    if (judge instanceof Promise) return judge;
                    return new List(judge);
                }
            }])
        }]).run());
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
