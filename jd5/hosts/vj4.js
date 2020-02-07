const
    axios = require('axios'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    WebSocket = require('ws'),
    log = require('../log'),
    { mkdirp } = require('../utils'),
    child = require('child_process'),
    { CACHE_DIR } = require('../config'),
    { FormatError } = require('../error');

module.exports = class AxiosInstance {
    constructor(config) {
        this.config = config;
        if (!this.config.server_url.startsWith('http')) this.config.server_url = 'http://' + this.config.server_url;
    }
    async init() {
        await this.setCookie(this.config.cookie || '');
        await this.ensureLogin();
    }
    async setCookie(cookie) {
        this.config.cookie = cookie;
        this.axios = axios.create({
            baseURL: this.config.server_url,
            timeout: 3000,
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
        let res = await this.axios.post('login', {
            uname: this.config.uname, password: this.config.password, rememberme: 'on'
        });
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
    async problem_data_version(domain_id, pid, retry = 3) {
        let location, err;
        try {
            await this.axios.get(`d/${domain_id}/p/${pid}/data`, { maxRedirects: 0 });
        } catch (res) {
            res.response = res.response || {};
            if (res.response.status == 302) {
                location = res.response.headers.location;
                if (location.startsWith('/fs/')) return location.split('/')[2];
            } else if (res.response.status == 404)
                throw new FormatError(`Testdata not found: ${domain_id}/${pid}`);
            else {
                if (retry) {
                    await this.ensureLogin();
                    return await this.problem_data_version(domain_id, pid, retry - 1);
                }
                res.config = res.request = null;
                err = res;
                console.log(err);
            }
        }
        if (!location) return 'unknown';
        try {
            await this.axios.get(location, { maxRedirects: 0 });
        } catch (res) {
            res.response = res.response || {};
            if (res.response.status == 302)
                return res.response.headers.location.split('/')[2];
            else if (res.response.status == 404)
                throw new FormatError(`Testdata not found: ${domain_id}/${pid}`);
            else {
                if (retry) return await this.problem_data_version(domain_id, pid, retry - 1);
                res.config = res.request = null;
                err = res;
                console.log(err);
            }
        }
        return 'unknown';
    }
    async problem_data(domain_id, pid, save_path, retry = 3) {
        log.info(`Getting problem data: ${this.config.host}/${domain_id}/${pid}`);
        let tmp_file_path = path.resolve(CACHE_DIR, `download_${this.config.host}_${domain_id}_${pid}`);
        try {
            await new Promise((resolve, reject) => {
                child.exec(`wget "${this.config.server_url}d/${domain_id}/p/${pid}/data" -O ${tmp_file_path} --header=cookie:${this.config.cookie}`, e => {
                    if (e) reject(e);
                    else resolve();
                });
            });
            await mkdirp(path.dirname(save_path));
            await new Promise((resolve, reject) => {
                child.exec(`unzip ${tmp_file_path} -d ${save_path}`, e => {
                    if (e) reject(e);
                    else resolve();
                });
            });
            await fsp.unlink(tmp_file_path);
            await this.process_data(save_path);
        } catch (e) {
            if (retry) await this.problem_data(domain_id, pid, save_path, retry - 1);
            else {
                throw e;
            }
        }
        return save_path;
    }
    async process_data(folder) {
        let files = await fsp.readdir(folder), ini = false;
        for (let i of files)
            if (i.toLowerCase() == 'config.ini') {
                ini = true;
                await fsp.rename(`${folder}/${i}`, folder + '/config.ini');
                break;
            }
        if (ini) {
            for (let i of files)
                if (i.toLowerCase() == 'input')
                    await fsp.rename(`${folder}/${i}`, folder + '/input');
                else if (i.toLowerCase() == 'output')
                    await fsp.rename(`${folder}/${i}`, folder + '/output');
            files = await fsp.readdir(folder + '/input');
            for (let i of files)
                await fsp.rename(`${folder}/input/${i}`, `${folder}/input/${i.toLowerCase()}`);
            files = await fsp.readdir(folder + '/output');
            for (let i of files)
                await fsp.rename(`${folder}/output/${i}`, `${folder}/output/${i.toLowerCase()}`);
        }
    }
    async record_pretest_data(rid, save_path) {
        log.info(`Getting pretest data: ${this.config.host}/${rid}`);
        let tmp_file_path = path.resolve(CACHE_DIR, `download_${this.config.host}_${rid}`);
        await this.ensureLogin();
        await new Promise((resolve, reject) => {
            child.exec(`wget "${this.config.server_url}records/${rid}/data" -O ${tmp_file_path} --header=cookie:${this.config.cookie}`, e => {
                if (e) reject(e);
                else resolve();
            });
        });
        await mkdirp(path.dirname(save_path));
        await new Promise((resolve, reject) => {
            child.exec(`unzip ${tmp_file_path} -d ${save_path}`, e => {
                if (e) reject(e);
                else resolve();
            });
        });
        await fsp.unlink(tmp_file_path);
        await this.process_data(save_path);
        return save_path;
    }
    async consume(queue) {
        log.log('Connecting: ' + this.config.server_url + 'judge/consume-conn');
        let res = await this.axios.get('judge/consume-conn/info');
        this.ws = new WebSocket(this.config.server_url.replace(/^http/i, 'ws') + 'judge/consume-conn/websocket?t=' + res.data.entropy, {
            headers: { cookie: this.config.cookie }
        });
        this.ws.on('message', data => {
            queue.push(Object.assign(JSON.parse(data), { host: this.config.host, ws: this.ws }));
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
