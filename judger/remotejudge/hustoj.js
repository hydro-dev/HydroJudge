const
    axios = require('axios'),
    { CompileError, TooFrequentError } = require('../error'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER, STATUS_RUNTIME_ERROR,
        STATUS_TIME_LIMIT_EXCEEDED, STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR,
        STATUS_MEMORY_LIMIT_EXCEEDED, STATUS_JUDGING } = require('../status'),
    { sleep } = require('../utils');

class HUSTOJ {
    constructor(config) {
        this.server_url = config.server_url.split('/', 3).join('/');
        this.state = {};
        this.STATUS = {
            'Accepted': STATUS_ACCEPTED,
            'AC': STATUS_ACCEPTED,
            '正确': STATUS_ACCEPTED,
            'Presentation_Error': STATUS_WRONG_ANSWER,
            'Presentation Error': STATUS_WRONG_ANSWER,
            'PE': STATUS_WRONG_ANSWER,
            '格式错误': STATUS_WRONG_ANSWER,
            'Wrong_Answer': STATUS_WRONG_ANSWER,
            'Wrong Answer': STATUS_WRONG_ANSWER,
            'WA': STATUS_WRONG_ANSWER,
            '答案错误': STATUS_WRONG_ANSWER,
            'Output_Limit_Exceed': STATUS_WRONG_ANSWER,
            'Output Limit Exceed': STATUS_WRONG_ANSWER,
            'Output_Limit_Exceeded': STATUS_WRONG_ANSWER,
            'Output Limit Exceeded': STATUS_WRONG_ANSWER,
            'OLE': STATUS_WRONG_ANSWER,
            '输出超限': STATUS_WRONG_ANSWER,
            'Runtime_Error': STATUS_RUNTIME_ERROR,
            'Runtime Error': STATUS_RUNTIME_ERROR,
            'RE': STATUS_RUNTIME_ERROR,
            '运行时错误': STATUS_RUNTIME_ERROR,
            'Dangerous Syscall': STATUS_RUNTIME_ERROR,
            'Time_Limit_Exceed': STATUS_TIME_LIMIT_EXCEEDED,
            'Time Limit Exceed': STATUS_TIME_LIMIT_EXCEEDED,
            'Time_Limit_Exceeded': STATUS_TIME_LIMIT_EXCEEDED,
            'Time Limit Exceeded': STATUS_TIME_LIMIT_EXCEEDED,
            'TLE': STATUS_TIME_LIMIT_EXCEEDED,
            '时间超限': STATUS_TIME_LIMIT_EXCEEDED,
            'Memory_Limit_Exceed': STATUS_MEMORY_LIMIT_EXCEEDED,
            'Memory Limit Exceed': STATUS_MEMORY_LIMIT_EXCEEDED,
            'Memory_Limit_Exceeded': STATUS_MEMORY_LIMIT_EXCEEDED,
            'Memory Limit Exceeded': STATUS_MEMORY_LIMIT_EXCEEDED,
            'MLE': STATUS_MEMORY_LIMIT_EXCEEDED,
            '内存超限': STATUS_MEMORY_LIMIT_EXCEEDED,
            'Compile_Error': STATUS_COMPILE_ERROR,
            'Compile Error': STATUS_COMPILE_ERROR,
            'Compilation_Error': STATUS_COMPILE_ERROR,
            'Compilation Error': STATUS_COMPILE_ERROR,
            'CE': STATUS_COMPILE_ERROR,
            '编译错误': STATUS_COMPILE_ERROR,
            'RF': STATUS_SYSTEM_ERROR,
            'System_Error': STATUS_SYSTEM_ERROR,
            'System Error': STATUS_SYSTEM_ERROR,
            'SE': STATUS_SYSTEM_ERROR,
            '未知错误': STATUS_SYSTEM_ERROR
        };
        this.LANGUAGES = {
            c: 0,
            cc: 1,
            pas: 2,
            java: 3,
            rb: 4,
            sh: 5,
            py: 6,
            php: 7,
            pl: 8,
            cs: 9,
            js: 16,
            go: 17
        };
        this.PROCESSING = ['等待', '运行并评判', '编译成功', 'Pending', 'Judging', 'Compiling', 'Running_Judging'];
        this.SUBMIT = ['/submit.php', ''];
        this.CEINFO = [['编译错误', 'Compile_Error', 'Compile Error'], '/ceinfo.php?sid={rid}', /<pre class=".*?" id='errtxt' >(.*?)<\/pre>/gmi];
        this.MONIT = ['/status.php?pid={pid}&user_id={uid}'];
        this.ACCEPTED = ['正确', 'Accepted', 'AC'];
        this.RID = /<tbody>\n<tr class="evenrow"><td>([0-9]+)<\/td>/igm;
    }
    async loginWithToken(cookie) {
        this.cookie = cookie;
        this.axios = axios.create({
            baseURL: this.server_url,
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': this.cookie,
                'Referer': this.server_url,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'
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
        let res = await this.axios.post(this.LOGIN[0], {
            [this.LOGIN[1]]: username,
            [this.LOGIN[2]]: password,
            ...this.LOGIN[3]
        });
        this.state.username = username;
        await this.loginWithToken(res.headers['set-cookie'].join('\n'));
    }
    async submit(pid, code, lang) {
        let res = await this.axios.post(this.SUBMIT[0], {
            [this.SUBTMI[1]]: pid,
            [this.SUBMIT[2]]: this.LANGUAGES[lang],
            [this.SUBMIT[3]]: code,
            ...this.SUBMIT[5]
        });
        if (res.data.find(this.SUBMIT[4])) throw new TooFrequentError();
        console.log(res.data);
        let url = this.MONIT[0].replace('{uid}', this.state.username).replace('{pid}', pid);
        let r = await this.axios.get(url);
        let rid = this.RID.exec(r.data)[1];
        return {
            uid: this.state.username,
            pid, rid
        };
    }
    async monit(data, next, end) {
        if (this.supermonit) return await this.supermonit(data, next, end);
        let url = this.MONIT[0].replace('{uid}', data.uid).replace('{pid}', data.pid);
        let RE = new RegExp(`<tr.*?class="evenrow".*?><td>${data.rid}</td>.*?</td><td>.*?</td><td><font color=".*?">(.*?)</font></td><td>(.*?)<font color="red">kb</font></td><td>(.*?)<font color="red">ms`, 'gmi');
        let res = await this.axios.get(url);
        let score;
        let [, status, time, memory] = RE.exec(res.data);
        while (this.PROCESSING.includes(status)) {
            next({ status: STATUS_JUDGING, progress: 0 });
            await sleep(1000);
            let res = await this.axios.get(url);
            [, status, time, memory] = RE.exec(res.data);
        }
        if (this.CEINFO[0].includes(status)) {
            url = this.CEINFO[1].replace('{rid}', data.rid);
            let res = await this.axios.get(url);
            let compiler_text = decodeURIComponent(this.CEINFO[2].exec(res.data)
                .replace('\n', '').replace('<br/>', '\n').replace('\n\n', '\n'));
            throw new CompileError({ compiler_text });
        } else if (this.ACCEPTED.includes(status)) score = 100;
        else score = 0;
        next({
            status: STATUS_JUDGING,
            case: {
                status: this.STATUS[status],
                score: score,
                time_ms: parseInt(time),
                memory_kb: parseInt(memory),
                judge_text: status
            },
            progress: 99
        });
        end({
            status: this.STATUS[status],
            score: score,
            time_ms: parseInt(time),
            memory_kb: parseInt(memory),
            judge_text: status
        });
    }
}

class YBT extends HUSTOJ {
    constructor(config) {
        super(config);
        this.LANGUAGES = {
            'cc': 1,
            'c': 2,
            'java': 3,
            'pas': 4,
            'py': 5,
            'py3': 5
        };
        this.LOGIN = ['/login.php', 'username', 'password', { login: '登录' }];
        this.SUBMIT = ['/action.php', 'problem_id', 'language', 'source', '提交频繁啦！', { submit: '提交', user_id: this.state.username }];
        this.CEINFO = ['/show_ce_info.php?runid={rid}', /<td class="ceinfo">(.*?)<\/td>/gmi];
    }
    async supermonit(data, next, end) {
        let url = `/statusx1.php?runidx=${data.rid}`;
        let res = await this.axios.get(url);
        let staText = res.data.split(':');
        while (this.PROCESSING.includes(staText[4])) {
            next({ status: STATUS_JUDGING, progress: 0 });
            await sleep(1000);
            res = this.axios.get(url);
            staText = res.data.split(':');
        }
        if (this.CEINFO[0].includes(staText[4])) {
            let url = this.CEINFO[1].replace('{rid}', data.rid);
            let res = await this.axios.get(url);
            let compiler_text = decodeURIComponent(this.CEINFO[2].exec(res.data)[1]
                .replace('\n', '').replace('<br/>', '\n').replace('\n\n', '\n'));
            throw new CompileError({ compiler_text });
        }
        staText[4] = staText[4].split('|');
        staText[5] = staText[5].split(',');
        let total_time_usage_ms = 0;
        let total_memory_usage_kb = 0;
        let total_score = 0;
        let total_status = STATUS_WRONG_ANSWER;
        if (this.ACCEPTED.includes(staText[4][0])) {
            total_score = 100;
            total_status = STATUS_ACCEPTED;
        }
        for (let i in staText[5]) {
            if (staText[5][i] == '') continue;
            let score;
            staText[5][i] = staText[5][i].split('|');
            if (this.ACCEPTED.includes(staText[5][i][0])) {
                score = 100;
                total_score += score;
            } else score = 0;
            staText[5][i][1] = staText[5][i][1].split('_');
            total_memory_usage_kb += parseInt(staText[5][i][1][0]);
            total_time_usage_ms += parseInt(staText[5][i][1][1]);
            next({
                status: STATUS_JUDGING,
                case: {
                    status: this.STATUS[staText[5][i][0]],
                    score: score,
                    time_ms: parseInt(staText[5][i][1][1]),
                    memory_kb: parseInt(staText[5][i][1][0])
                },
                progress: 99
            });
        }
        if (this.ACCEPTED.includes(staText[4][0])) {
            total_score = 100;
            total_status = STATUS_ACCEPTED;
        }
        end({
            status: total_status,
            score: total_score,
            time_ms: total_time_usage_ms,
            memory_kb: total_memory_usage_kb
        });
    }
}

class BZOJ extends HUSTOJ {
    constructor(config) {
        super(config);
        this.LOGIN = ['/login.php', 'user_id', 'password', { submit: 'Submit' }];
        this.SUBMIT = ['/submit.php', 'id', 'language', 'source', 'You should not submit more than twice in 10 seconds.....', {}];
        this.CEINFO = ['/ceinfo.php?sid={rid}', /<pre>([\s\S]*?)<\/pre>/igm];
        this.RID = /Submit_Time<\/td><\/tr>\n<tr align="center" class="evenrow"><td>([0-9]+)/igm;
    }
}

class XJOI extends HUSTOJ {
    constructor(config) {
        super(config);
        this.LANGUAGES = { cc: 'g++', c: 'gcc', pas: 'fpc' };
        this.LOGIN = ['/', 'user', 'pass', { remember: 'on' }];
        this.SUBMIT = ['/submit', 'proid', 'language', 'source', '请稍后再提交', {}];
        this.SUPERMONIT = [
            /<textarea .*?>([\s\S]*?)<\/textarea>/igm,
            /time: ([0-9]+)ms, memory: ([0-9]+)kb, points: ([0-9]+), status: (.*?)/gmi
        ];
        this.RID = /<tr class="table-bordered"><td class="status-table-text"> <a href="\/detail\/([0-9]+)"/igm;
    }
    async supermonit(data, next, end) {
        let url = `/detail${data.rid}`;
        let res = await this.axios.get(url);
        let msg = this.SUPERMONIT.exec(res)[1].split('\n');
        while (this.PROCESSING.includes(msg[0])) {
            await sleep(1000);
            res = await this.axios.get(url);
            msg = this.SUPERMONIT.exec(res)[1].split('\n');
        }
        if (msg[0] == 'compile error') throw new CompileError(msg.join('\n'));
        else for (let i = 2; i < msg.length - 1; i++) {
            let [, time, memory, score, status] = this.SUPERMONIT[1].exec(msg[i]);
            next({
                status: STATUS_JUDGING,
                case: {
                    time_ms: parseInt(time),
                    memory_kb: parseInt(memory),
                    score: parseInt(score),
                    status: this.STATUS[status]
                }
            });
        }
        let [, time, memory, score, status] = this.SUPERMONIT[1].exec(msg[1]);
        end({
            time_ms: parseInt(time),
            memory_kb: parseInt(memory),
            score: parseInt(score),
            status: this.STATUS[status]
        });
    }
}

HUSTOJ.YBT = YBT;
HUSTOJ.BZOJ = BZOJ;
HUSTOJ.XJOI = XJOI;
module.exports = HUSTOJ;
