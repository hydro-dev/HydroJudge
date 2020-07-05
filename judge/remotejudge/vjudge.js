const axios = require('axios');
const { SystemError, CompileError } = require('../error');
const status = require('../status');

const STATUS = {
    QUEUEING: status.STATUS_COMPILING,
    PENDING: status.STATUS_COMPILING,
    SUBMITTED: status.STATUS_COMPILING,
    JUDGING: status.STATUS_JUDGING,
    AC: status.STATUS_ACCEPTED,
    WA: status.STATUS_WRONG_ANSWER,
    RE: status.STATUS_RUNTIME_ERROR,
    CE: status.STATUS_COMPILE_ERROR,
    PE: status.STATUS_WRONG_ANSWER,
    TLE: status.STATUS_TIME_LIMIT_EXCEEDED,
    MLE: status.STATUS_MEMORY_LIMIT_EXCEEDED,
    OLE: status.STATUS_WRONG_ANSWER,
    FAILED_OTHER: status.STATUS_SYSTEM_ERROR,
    SUBMIT_FAILED_PERM: status.STATUS_SYSTEM_ERROR,
    SUBMIT_FAILED_TEMP: status.STATUS_SYSTEM_ERROR,
};
const LANGS = require('../data/languages.json');

module.exports = class VJudge {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
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
        const res = await this.axios.post('/user/login', { username, password });
        await this.loginWithToken(res.headers['set-cookie'][0].split(';')[0]);
    }

    async submit(pidStr, code, lang, next) {
        const [oj, probNum] = pidStr.split('/');
        if (!LANGS[oj]) throw new SystemError('Problem config error: Remote oj doesn\'t exist.', [oj]);
        const language = LANGS[oj][lang];
        if (!language) throw new CompileError(`Language not supported by remote oj: ${lang}`);
        const source = Buffer.from(encodeURIComponent(code)).toString('base64');
        const res = await this.axios.post('/problem/submit', {
            oj, probNum, share: 0, source, captcha: '', language,
        });
        if (res.data.error) throw new SystemError(res.data.error);
        next({ judge_text: `Submitted: ID=${res.data.runId}` });
        return { id: res.data.runId };
    }

    monit(data, next, end) {
        return new Promise((resolve) => {
            let lastStatus = null;
            const fetch = async () => {
                const resp = await this.axios.get(`/solution/data/${data.id}`);
                const r = resp.data;
                if (!lastStatus) { next({ judge_text: `Using language: ${r.language}` }); }
                if (lastStatus !== r.status) {
                    next({ judge_text: `Status=${r.status}` });
                    lastStatus = r.status;
                }
                if (!r.processing) {
                    console.log(r);
                    next({ compiler_text: r.additionalInfo });
                    end({
                        status: STATUS[r.statusCanonical],
                        score: STATUS[r.statusCanonical] === status.STATUS_ACCEPTED ? 100 : 0,
                        time_ms: r.runtime || 0,
                        memory_kb: r.memory || 0,
                    });
                    resolve();
                } else setTimeout(() => { fetch(); }, 1000);
            };
            fetch();
        });
    }
};
