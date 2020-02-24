const
    axios = require('axios'),
    fs = require('fs'),
    path = require('path'),
    WebSocket = require('ws'),
    log = require('../log'),
    { rmdir, outputLimit } = require('../utils'),
    { TEMP_DIR } = require('../config'),
    { CompileError } = require('../error'),
    { STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR } = require('../status'),
    judger = require('../judger');

module.exports = class IDE {
    constructor(config) {
        this.config = config;
        if (!this.config.server_url.startsWith('http')) this.config.server_url = 'http://' + this.config.server_url;
    }
    async init() { }
    async consume(queue) {
        log.log('Connecting: ' + this.config.server_url + 'runner');
        let res = await axios.get('runner/info');
        this.ws = new WebSocket(this.config.server_url.replace(/^http/i, 'ws') + 'runner/websocket?t=' + res.data.entropy, {
            headers: { cookie: this.config.cookie }
        });
        this.ws.on('message', data => {
            let request = JSON.parse(data);
            if (!request.event) queue.push(new JudgeTask(this, request, this.ws));
        });
        this.ws.on('close', (data, reason) => {
            log.warn(`[${this.config.host}] Websocket closed:`, data, reason);
            setTimeout(() => {
                this.retry(queue);
            }, 30000);
        });
        this.ws.on('error', e => {
            log.error(`[${this.config.host}] Websocket error:`, e);
            setTimeout(() => {
                this.retry(queue);
            }, 30000);
        });
        await new Promise(resolve => {
            this.ws.once('open', () => { resolve(); });
        });
        log.info(`[${this.config.host}] Connected`);
    }
    async retry(queue) {
        this.consume(queue).catch(() => {
            setTimeout(() => {
                this.retry(queue);
            }, 30000);
        });
    }
};

class JudgeTask {
    constructor(session, request, ws) {
        this.stat = {};
        this.stat.receive = new Date();
        this.session = session;
        this.host = session.config.host;
        this.request = request;
        this.ws = ws;
    }
    async handle(pool) {
        this.stat.handle = new Date();
        this.pool = pool;
        this.tag = this.request.tag;
        this.rid = this.request.rid;
        this.lang = this.request.lang;
        this.code = this.request.code;
        this.next = this.get_next(this.ws, this.tag);
        this.end = this.get_end(this.ws, this.tag);
        this.tmpdir = path.resolve(TEMP_DIR, this.host, this.rid);
        fs.mkdirSync(this.tmpdir, { recursive: true });
        log.submission(`${this.host}/${this.rid}`);
        try {
            await this.run();
        } catch (e) {
            if (e instanceof CompileError) {
                this.next({ compiler_text: outputLimit(e.stdout, e.stderr) });
                this.end({ status: STATUS_COMPILE_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            } else {
                log.error(e);
                this.next({ judge_text: e.message + '\n' + e.stack + '\n' + JSON.stringify(e.params) });
                this.end({ status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            }
        }
        await rmdir(path.resolve(TEMP_DIR, this.host, this.rid));
    }
    async run() {
        this.folder = path.resolve(this.tmpdir, 'data');
        this.config = {
            count: 1,
            time_limit_ms: 5000,
            memory_limit_mb: 256,
            input: path.resolve(this.folder, 'input'),
            output: path.resolve(this.folder, 'output'),
            score: 100
        };
        await judger.ide.judge(this);
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
}