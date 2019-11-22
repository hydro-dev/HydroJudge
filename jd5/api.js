const
    axios = require('axios'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    WebSocket = require('ws'),
    AdmZip = require('adm-zip'),
    log = require('./log'),
    { download } = require('./utils'),
    cache = require('./cache'),
    { CACHE_DIR } = require('./config');

module.exports = class AxiosInstance {
    constructor(config) {
        this.config = config;
    }
    async init() {
        if (typeof this.config.detail == 'undefined') this.config.detail = true;
        await this.setCookie(this.config.cookie || '');
        await this.ensureLogin();
    }
    async setCookie(cookie) {
        log.log(`[${this.config.host}] Setting cookie: ${cookie}`);
        this.config.cookie = cookie;
        this.axios = axios.create({
            baseURL: this.config.server_url,
            timeout: 10000,
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'cookie': this.config.cookie
            },
            transformRequest: [
                function (data) {
                    let ret = '';
                    for (let it in data)
                        ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&';
                    return ret;
                }
            ]
        });
    }
    async login() {
        let res = await this.axios.post('login', { uname: this.config.uname, password: this.config.password });
        await this.setCookie(res.headers['set-cookie'][0].split(';')[0]);
    }
    async ensureLogin() {
        log.log(`[${this.config.host}] Updating session`);
        try {
            await this.axios.get('judge/noop');
        } catch (e) {
            await this.login();
        }
    }
    async problem_data(domain_id, pid, save_path, retry = 3) {
        log.info('Getting problem data: %s/%s/%s', this.config.host, domain_id, pid);
        let tmp_file_path = path.resolve(CACHE_DIR, `download_${this.host}_${domain_id}_${pid}`);
        try{
            await download(this.axios, `d/${domain_id}/p/${pid}/data`, tmp_file_path);
            let zipfile = new AdmZip(tmp_file_path);
            await new Promise((resolve, reject) => {
                zipfile.extractAllToAsync(save_path, true, err => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            await fsp.unlink(tmp_file_path);
            await this.process_data(save_path);
        }catch(e){
            if (retry) await this.problem_data(domain_id, pid, save_path, retry - 1);
            else throw e;
        }
        return save_path;
    }
    async process_data(folder){
    }
    async record_pretest_data(rid, save_path) {
        log.info('Getting pretest data: %s/%s', this.config.host, rid);
        let tmp_file_path = path.resolve(CACHE_DIR, `download_${this.host}_${rid}`);
        await download(this.axios, `records/${rid}/data`, tmp_file_path);
        let zipfile = new AdmZip(tmp_file_path);
        await new Promise((resolve, reject) => {
            zipfile.extractAllToAsync(save_path, true, err => {
                if (err) reject(err);
                else resolve();
            });
        });
        await fsp.unlink(tmp_file_path);
        return save_path;
    }
    async judge_datalist(last) {
        let res = await this.axios.get('judge/datalist', { params: { last } });
        return res.data;
    }
    async updateProblemData() {
        log.info(`[${this.config.host}] Update problem data`);
        let result = await this.judge_datalist(this.config.last_update_at || 0);
        for (let pid of result.pids) {
            await cache.invalidate(this.host, pid.domain_id, pid.pid);
            log.debug('Invalidated %s/%s/%s', this.config.host, pid.domain_id, pid.pid);
        }
        this.config.last_update_at = result.time;
    }
    async consume(queue) {
        log.log('Connecting: ', this.config.server_url + 'judge/consume-conn');
        let res = await this.axios.get('judge/consume-conn/info');
        this.ws = new WebSocket(this.config.server_url.replace(/^http/i, 'ws') + 'judge/consume-conn/websocket?t=' + res.data.entropy, {
            headers: { cookie: this.config.cookie }
        });
        this.ws.on('message', data => {
            queue.push(Object.assign(JSON.parse(data), { host: this.config.host, ws: this.ws }));
        });
        this.ws.on('close', (data, reason) => {
            log.log(`[${this.config.host}] Websocket closed:`, data, reason);
        });
        this.ws.on('error', e => {
            log.log(`[${this.config.host}] Websocket error:`, e);
        });
        await new Promise(resolve => {
            this.ws.once('open', () => { resolve(); });
        });
        log.info(`[${this.config.host}] Connected`);
    }
};
