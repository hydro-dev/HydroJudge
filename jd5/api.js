const
    axios = require('axios'),
    fsp = require('fs').promises,
    os = require('os'),
    path = require('path'),
    yaml = require('js-yaml'),
    WebSocket = require('ws'),
    AdmZip = require('adm-zip'),
    log = require('./log'),
    { download, Queue } = require('./utils'),
    cache = require('./cache'),
    { CONFIG_DIR } = require('./config'),
    _CONFIG_FILE = path.resolve(CONFIG_DIR, 'config.yaml'),
    _COOKIES_FILE = path.resolve(CONFIG_DIR, 'cookies');

module.exports = class AxiosInstance {
    constructor() { }
    async init() {
        let config = await fsp.readFile(_CONFIG_FILE).catch(() => {
            log.error(`Config file not found at ${_CONFIG_FILE}`);
            process.exit(1);
        });
        try {
            this.config = yaml.safeLoad(config.toString());
        } catch (e) {
            log.error('Invalid config file.');
            process.exit(1);
        }
        let cookie = (await fsp.readFile(_COOKIES_FILE).catch(() => { })) || '';
        await this.setCookie(cookie.toString());
        await this.ensureLogin();
    }
    async setCookie(cookie) {
        log.log(`Setting cookie: ${cookie}`);
        this.cookie = cookie;
        await fsp.writeFile(_COOKIES_FILE, cookie);
        this.axios = axios.create({
            baseURL: this.config.server_url,
            timeout: 1000,
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'cookie': this.cookie
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
        try {
            await this.axios.get('judge/noop');
        } catch (e) {
            await this.login();
        }
    }
    async problem_data(domain_id, pid, save_path) {
        log.info('Getting problem data: %s, %s', domain_id, pid);
        let tmp_file_path = path.resolve(os.tmpdir(), `jd5_testdata_download_${domain_id}_${pid}`);
        await download(this.axios, `d/${domain_id}/p/${pid}/data`, tmp_file_path);
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
    async record_pretest_data(rid, save_path) {
        log.info('Getting pretest data: %s', rid);
        let tmp_file_path = path.resolve(os.tmpdir(), `jd5_testdata_download_${rid}`);
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
    async update_problem_data() {
        log.info('Update problem data');
        let result = await this.judge_datalist(this.config.last_update_at || 0);
        for (let pid of result.pids) {
            await cache.invalidate(pid.domain_id, pid.pid);
            log.debug('Invalidated %s/%s', pid.domain_id, pid.pid);
        }
        this.config.last_update_at = result.time;
        await this.save_config();
    }
    async judge_consume(handler, sandbox) {
        log.log('Connecting: ', this.config.server_url + 'judge/consume-conn');
        let res = await this.axios.get('judge/consume-conn/info');
        log.log(res.data);
        this.ws = new WebSocket(this.config.server_url.replace(/https?:\/\//i, 'ws://') + 'judge/consume-conn/websocket?t=' + res.entropy, {
            headers: {
                cookie: this.cookie
            }
        });
        let queue = new Queue();
        this.ws.on('message', data => {
            queue.push(JSON.parse(data));
        });
        this.ws.on('close', (data, reason) => {
            log.log('websocket closed:', data, reason);
        });
        this.ws.on('error', data => {
            log.log('websocket error', data);
        });
        await new Promise(resolve => {
            this.ws.once('open', () => { resolve(); });
        });
        log.info('Connected');
        while ('Orz iceb0y') { //eslint-disable-line no-constant-condition
            let request = await queue.get();
            await new handler(this, request, this.ws, sandbox).handle();
        }
    }
    async save_config() {
        await fsp.writeFile(_CONFIG_FILE, yaml.safeDump(this.config));
    }
};