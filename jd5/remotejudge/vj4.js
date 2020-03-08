const
    axios = require('axios'),
    WebSocket = require('ws'),
    { SystemError } = require('../error'),
    RE_CSRF = /\{"csrf_token":"(.*?)"/i,
    RE_RID = /\{"socketUrl":"(.*?)"/i;
module.exports = class VJ4 {
    constructor(server_url) {
        this.server_url = server_url.split('/', 3).join('/');
    }
    async loginWithToken(cookie) {
        this.cookie = cookie;
        this.axios = axios.create({
            baseURL: this.server_url,
            timeout: 30000,
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
    async login(username, password) {
        await this.loginWithToken('');
        let res = await this.axios.post('login', { uname: username, password });
        await this.loginWithToken(res.headers['set-cookie'][0].split(';')[0]);
    }
    async judge(pid_str, code, lang, next, end) {
        let [domain_id, pid] = pid_str.split('/');
        let res = await this.axios.get(`/d/${domain_id}/p/${pid}/submit`, { headers: { 'accept': 'document/html' } });
        let csrf_token = RE_CSRF.exec(res.data)[1];
        let resp = await this.axios.post(`/d/${domain_id}/p/${pid}/submit`, {
            lang, code, csrf_token
        }, { headers: { 'accept': 'document/html' } });
        let socketUrl = RE_RID.exec(resp.data)[1];
        let wsinfo = await this.axios.get(socketUrl);
        this.ws = new WebSocket(this.server_url.replace(/^http/i, 'ws') + socketUrl + '/websocket?t=' + wsinfo.data.entropy, {
            headers: { cookie: this.cookie }
        });
        this.ws.on('close', data => {
            throw new SystemError('RemoteJudge Websocket closed unexpectedly: ' + data);
        });
        this.ws.on('error', e => {
            throw new SystemError('RemoteJudge Websocket closed unexpectedly: ' + e);
        });
        await new Promise(resolve => {
            this.timeout = setTimeout(resolve, 5000);
            this.ws.on('message', data => {
                // TODO: handle real-time update
                clearTimeout(this.timeout);
                this.timeout = setTimeout(resolve, 5000);
            });
        });
        let s = await this.axios.get(`/d/${domain_id}/p/${pid}/submit`);
        let r = s.data.rdocs[0];
        for (let compiler_text of r.compiler_texts)
            next({ compiler_text });
        for (let judge_text of r.judge_texts)
            next({ judge_text });
        for (let i of r.cases)
            next({ status: r.status, case: i, progress: 0 });
        end({
            status: r.status,
            score: r.score,
            time_ms: r.time_ms,
            memory_kb: r.memory_kb
        });
    }
};
