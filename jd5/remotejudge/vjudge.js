const
    axios = require('axios'),
    WebSocket = require('ws'),
    { SystemError, CompileError } = require('../error'),
    RE_CSRF = /\{"csrf_token":"(.*?)"/i,
    RE_RID = /\{"socketUrl":"(.*?)"/i,
    status = require('../status'),
    STATUS = {
        'QUEUEING': status.STATUS_COMPILING,
        'PENDING': status.STATUS_COMPILING,
        'SUBMITTED': status.STATUS_COMPILING,
        'JUDGING': status.STATUS_JUDGING,
        'AC': status.STATUS_ACCEPTED,
        'WA': status.STATUS_WRONG_ANSWER,
        'RE': status.STATUS_RUNTIME_ERROR,
        'CE': status.STATUS_COMPILE_ERROR,
        'PE': status.STATUS_WRONG_ANSWER,
        'TLE': status.STATUS_TIME_LIMIT_EXCEEDED,
        'MLE': status.STATUS_MEMORY_LIMIT_EXCEEDED,
        'OLE': status.STATUS_WRONG_ANSWER,
        'FAILED_OTHER': status.STATUS_SYSTEM_ERROR,
        'SUBMIT_FAILED_PERM': status.STATUS_SYSTEM_ERROR,
        'SUBMIT_FAILED_TEMP': status.STATUS_SYSTEM_ERROR,
    },
    LANGS = require('../data/languages.json');

module.exports = class VJudge {
    constructor(server_url) {
        this.server_url = server_url;
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
        let res = await this.axios.post('/user/login', { username, password });
        await this.loginWithToken(res.headers['set-cookie'][0].split(';')[0]);
    }
    async judge(pid_str, code, lang, next, end) {
        let [oj, probNum] = pid_str.split('/');
        if (!LANGS[oj]) throw new SystemError('Problem config error: Remote oj doesn\'t exist.', [oj]);
        let language = LANGS[oj][lang];
        if (!language) throw new CompileError('Language not supported by remote oj:', [lang]);
        let source = Buffer.from(code).toString('base64');
        let res = await this.axios.post('/problem/submit', {
            oj, probNum, share: 0, source, captcha: '', language
        });
        if (res.data.error) throw new SystemError(res.data.error);
        next({ judge_text: `Submitted: ID=${res.data.runId}` });
        await new Promise(resolve => {
            let lastStatus = null;
            let fetch = async () => {
                let resp = await this.axios.get(`/solution/data/${res.data.runId}`);
                let r = resp.data;
                if (!lastStatus)
                    next({ judge_text: `Using language: ${r.language}` });
                if (lastStatus != r.status) {
                    next({ judge_text: `Status=${r.status}` });
                    lastStatus = r.status;
                }
                if (!res.processing) {
                    console.log(r);
                    next({ compiler_text: r.additionalInfo });
                    end({
                        status: STATUS[r.statusCanonical],
                        score: STATUS[r.statusCanonical] == status.STATUS_ACCEPTED ? 100 : 0,
                        time_ms: r.runtime || 0,
                        memory_kb: r.memory || 0
                    });
                    resolve();
                } else setTimeout(() => { fetch(); }, 1000);
            };
            fetch();
        });
    }
};
