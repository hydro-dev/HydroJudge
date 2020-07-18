/* eslint-disable no-await-in-loop */
const path = require('path');
const child = require('child_process');
const axios = require('axios');
const fs = require('fs-extra');
const tmpfs = require('../tmpfs');
const log = require('../log');
const sysinfo = require('../sysinfo');
const { compilerText } = require('../utils');
const { CACHE_DIR, TEMP_DIR } = require('../config');
const { FormatError, CompileError } = require('../error');
const { STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR } = require('../status');
const readCases = require('../cases');
const judge = require('../judge');

const fsp = fs.promises;

class JudgeTask {
    constructor(session, request) {
        this.stat = {};
        this.stat.receive = new Date();
        this.session = session;
        this.host = session.config.host;
        this.request = request;
    }

    async handle() {
        try {
            this.stat.handle = new Date();
            this.pid = (this.request.pid || 'unknown').toString();
            this.rid = this.request.rid.toString();
            this.domainId = this.request.domainId;
            this.lang = this.request.lang;
            this.code = this.request.code;
            this.data = this.request.data;
            this.next = this.getNext(this);
            this.end = this.getEnd(this.session, this.domainId, this.rid);
            this.tmpdir = path.resolve(TEMP_DIR, 'tmp', this.host, this.rid);
            this.clean = [];
            fs.ensureDirSync(this.tmpdir);
            tmpfs.mount(this.tmpdir, '64m');
            log.submission(`${this.host}/${this.rid}`, { pid: this.pid });
            await this.submission();
        } catch (e) {
            if (e instanceof CompileError) {
                this.next({ compiler_text: compilerText(e.stdout, e.stderr) });
                this.end({
                    status: STATUS_COMPILE_ERROR, score: 0, time_ms: 0, memory_kb: 0,
                });
            } else if (e instanceof FormatError) {
                this.next({ judge_text: `${e.message}\n${JSON.stringify(e.params)}` });
                this.end({
                    status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0,
                });
            } else {
                log.error(e);
                this.next({ judge_text: `${e.message}\n${e.stack}\n${JSON.stringify(e.params)}` });
                this.end({
                    status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0,
                });
            }
        }
        for (const clean of this.clean) await clean().catch();
        tmpfs.umount(this.tmpdir);
        fs.removeSync(this.tmpdir);
    }

    async submission() {
        this.stat.cache_start = new Date();
        this.folder = await this.session.cacheOpen(this.pid, this.data);
        this.stat.read_cases = new Date();
        this.config = await readCases(
            this.folder,
            { detail: this.session.config.detail },
            { next: this.next, config: this.request.config },
        );
        this.stat.judge = new Date();
        await judge[this.config.type || 'default'].judge(this);
    }

    async run() {
        this.stat.judge = new Date();
        await judge.run.judge(this);
    }

    getNext(that) { // eslint-disable-line class-methods-use-this
        that.nextId = 1;
        that.nextWaiting = [];
        return (data, id) => {
            data.operation = 'next';
            data.domainId = that.domainId;
            data.rid = that.rid;
            data.time = data.time_ms || data.time;
            data.memory = data.memory_kb || data.memory;
            data.message = data.judge_text || data.message;
            data.compilerText = data.compiler_text || data.compilerText;
            if (data.case) {
                data.case = {
                    status: data.case.status,
                    time: data.case.time_ms || data.case.time,
                    memory: data.case.memory_kb || data.case.memory,
                    message: data.judge_text || data.message || data.judgeText,
                };
            }
            if (id) {
                if (id === that.nextId) {
                    that.session.axios.post('/judge', data);
                    that.nextId++;
                    let t = true;
                    while (t) {
                        t = false;
                        for (const i in that.nextWaiting) {
                            if (that.nextId === that.nextWaiting[i].id) {
                                that.session.axios.post('/judge', that.nextWaiting[i].data);
                                that.nextId++;
                                that.nextWaiting.splice(i, 1);
                                t = true;
                            }
                        }
                    }
                } else that.nextWaiting.push({ data, id });
            } else that.session.axios.post('/judge', data);
        };
    }

    getEnd(session, domainId, rid) { // eslint-disable-line class-methods-use-this
        return (data) => {
            data.operation = 'end';
            data.domainId = domainId;
            data.rid = rid;
            data.time = data.time_ms || data.time;
            data.memory = data.memory_kb || data.memory;
            log.log({
                status: data.status,
                score: data.score,
                time_ms: data.time_ms,
                memory_kb: data.memory_kb,
            });
            session.axios.post('/judge', data);
        };
    }
}

class Hydro {
    constructor(config) {
        this.config = config;
        this.config.detail = this.config.detail || true;
        this.config.cookie = this.config.cookie || '';
        this.config.last_update_at = this.config.last_update_at || 0;
        if (!this.config.server_url.startsWith('http')) this.config.server_url = `http://${this.config.server_url}`;
        if (!this.config.server_url.endsWith('/')) this.config.server_url = `${this.config.server_url}/`;
    }

    async init() {
        await this.setCookie(this.config.cookie || '');
        await this.ensureLogin();
        const info = await sysinfo.get();
        this.axios.post('/status/update', info);
        setInterval(async () => {
            const [_id, info] = await sysinfo.update();
            this.axios.post('/status/update', { _id, ...info });
        }, 1200000);
    }

    async problemData(pid, savePath, retry = 3) {
        log.info(`Getting problem data: ${this.config.host}/${pid}`);
        await this.ensureLogin();
        const tmpFilePath = path.resolve(CACHE_DIR, `download_${this.config.host}_${pid}`);
        try {
            console.log(`${this.config.server_url}/p/${pid}/data`);
            const res = await this.axios.get(`${this.config.server_url}/p/${pid}/data`, { responseType: 'stream' });
            const w = await fs.createWriteStream(tmpFilePath);
            res.data.pipe(w);
            await new Promise((resolve, reject) => {
                w.on('finish', resolve);
                w.on('error', reject);
            });
            fs.ensureDirSync(path.dirname(savePath));
            await new Promise((resolve, reject) => {
                child.exec(`unzip ${tmpFilePath} -d ${savePath}`, (e) => {
                    if (e) reject(e);
                    else resolve();
                });
            });
            await fsp.unlink(tmpFilePath);
            await this.processData(savePath).catch();
        } catch (e) {
            if (retry) await this.problemData(pid, savePath, retry - 1);
            else throw e;
        }
        return savePath;
    }

    async consume(queue) {
        setInterval(async () => {
            const res = await this.axios.get('/judge');
            console.log(res.data);
            if (res.data.task) queue.push(new JudgeTask(this, res.data.task));
        }, 1000);
    }

    async setCookie(cookie) {
        this.config.cookie = cookie;
        this.axios = axios.create({
            baseURL: this.config.server_url,
            timeout: 30000,
            headers: { cookie: this.config.cookie },
        });
    }

    async login() {
        log.log(`[${this.config.host}] Updating session`);
        const res = await this.axios.post('login', {
            uname: this.config.uname, password: this.config.password, rememberme: 'on',
        });
        await this.setCookie(res.headers['set-cookie'].join(';'));
    }

    async ensureLogin() {
        const res = await this.axios.get('/judge?check=true');
        if (res.data.error) await this.login();
    }

    async processData(folder) { // eslint-disable-line class-methods-use-this
        let files = await fsp.readdir(folder); let
            ini = false;
        for (const i of files) {
            if (i.toLowerCase() === 'config.ini') {
                ini = true;
                await fsp.rename(`${folder}/${i}`, `${folder}/config.ini`);
                break;
            }
        }
        if (ini) {
            for (const i of files) {
                if (i.toLowerCase() === 'input') {
                    await fsp.rename(`${folder}/${i}`, `${folder}/input`);
                } else if (i.toLowerCase() === 'output') {
                    await fsp.rename(`${folder}/${i}`, `${folder}/output`);
                }
            }
            files = await fsp.readdir(`${folder}/input`);
            for (const i of files) {
                await fsp.rename(`${folder}/input/${i}`, `${folder}/input/${i.toLowerCase()}`);
            }
            files = await fsp.readdir(`${folder}/output`);
            for (const i of files) {
                await fsp.rename(`${folder}/output/${i}`, `${folder}/output/${i.toLowerCase()}`);
            }
        }
    }

    async cacheOpen(pid, version) {
        console.log(this.config.host, pid);
        const filePath = path.join(CACHE_DIR, this.config.host, pid);
        if (fs.existsSync(filePath)) {
            let ver;
            try {
                ver = fs.readFileSync(path.join(filePath, 'version')).toString();
            } catch (e) { /* ignore */ }
            if (version === ver) return filePath;
            fs.removeSync(filePath);
        }
        fs.ensureDirSync(filePath);
        await this.problemData(pid, filePath);
        fs.writeFileSync(path.join(filePath, 'version'), version);
        return filePath;
    }
}

Hydro.JudgeTask = JudgeTask;
module.exports = Hydro;
