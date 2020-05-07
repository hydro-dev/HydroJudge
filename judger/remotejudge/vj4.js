const axios = require('axios');
const WebSocket = require('ws');
const { SystemError } = require('../error');

const RE_CSRF = /\{"csrf_token":"(.*?)"/i;
const RE_RID = /\{"socketUrl":"(.*?)"/i;

module.exports = class VJ4 {
    constructor(serverUrl) {
        this.serverUrl = serverUrl.split('/', 3).join('/');
    }

    async loginWithToken(cookie) {
        this.cookie = cookie;
        this.axios = axios.create({
            baseURL: this.serverUrl,
            timeout: 30000,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                cookie: this.cookie,
            },
            transformRequest: [
                (data) => {
                    let ret = '';
                    for (const it in data) {
                        ret += `${encodeURIComponent(it)}=${encodeURIComponent(data[it])}&`;
                    }
                    return ret;
                },
            ],
        });
    }

    async login(username, password) {
        await this.loginWithToken('');
        const res = await this.axios.post('login', { uname: username, password });
        await this.loginWithToken(res.headers['set-cookie'][0].split(';')[0]);
    }

    async submit(pidStr, code, lang) {
        const [domainId, pid] = pidStr.split('/');
        const res = await this.axios.get(`/d/${domainId}/p/${pid}/submit`, { headers: { accept: 'document/html' } });
        const csrf_token = RE_CSRF.exec(res.data)[1]; // eslint-disable-line camelcase
        const resp = await this.axios.post(`/d/${domainId}/p/${pid}/submit`, {
            lang, code, csrf_token,
        }, { headers: { accept: 'document/html' } });
        return {
            socketUrl: RE_RID.exec(resp.data)[1],
            domain_id: domainId,
            pid,
        };
    }

    async monit(data, next, end) {
        const wsinfo = await this.axios.get(data.socketUrl);
        this.ws = new WebSocket(`${this.serverUrl.replace(/^http/i, 'ws') + data.socketUrl}/websocket?t=${wsinfo.data.entropy}`, {
            headers: { cookie: this.cookie },
        });
        this.ws.on('close', (data) => {
            throw new SystemError(`RemoteJudge Websocket closed unexpectedly: ${data}`);
        });
        this.ws.on('error', (e) => {
            throw new SystemError(`RemoteJudge Websocket closed unexpectedly: ${e}`);
        });
        await new Promise((resolve) => {
            this.timeout = setTimeout(resolve, 5000);
            this.ws.on('message', () => {
                // TODO: handle real-time update
                clearTimeout(this.timeout);
                this.timeout = setTimeout(resolve, 5000);
            });
        });
        const s = await this.axios.get(`/d/${data.domain_id}/p/${data.pid}/submit`);
        const r = s.data.rdocs[0];
        // eslint-disable-next-line camelcase
        for (const compiler_text of r.compiler_texts) next({ compiler_text });
        // eslint-disable-next-line camelcase
        for (const judge_text of r.judge_texts) next({ judge_text });
        for (const i of r.cases) next({ status: r.status, case: i, progress: 0 });
        end({
            status: r.status,
            score: r.score,
            time_ms: r.time_ms,
            memory_kb: r.memory_kb,
        });
    }
};
