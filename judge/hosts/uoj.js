const path = require('path');
const assert = require('assert');
const child = require('child_process');
const axios = require('axios');
const fs = require('fs-extra');
const log = require('../log');
const { compilerText } = require('../utils');
const { CACHE_DIR, TEMP_DIR } = require('../config');
const { FormatError, CompileError } = require('../error');
const { STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR } = require('../status');
const readCases = require('../cases');
const judge = require('../judge');

const fsp = fs.promises;
const LANGS_MAP = {
    C: 'c',
    'C++': 'cc98',
    'C++11': 'cc11',
    Java8: 'java',
    Java11: 'java',
    Pascal: 'pas',
    Python2: 'py2',
    Python3: 'py3',
};

class JudgeTask {
    constructor(session, submission) {
        this.stat = {};
        this.stat.receive = new Date();
        console.log(submission.content);
        this.session = session;
        this.submission = submission;
    }

    async handle() {
        this.stat.handle = new Date();
        this.host = this.session.config.host;
        this.rid = this.submission.id;
        this.pid = this.submission.problem_id;
        this.problem_mtime = this.submission.problem_mtime;
        for (const i of this.submission.content.config) {
            if (i[0] === 'answer_language') this.lang = LANGS_MAP[i[1]];
        }
        this.tmpdir = path.resolve(TEMP_DIR, 'tmp', this.host, this.rid.toString());
        this.details = {
            cases: [],
            compiler_text: [],
            judge_text: [],
        };
        fs.ensureDirSync(this.tmpdir);
        log.submission(`${this.host}/${this.rid}`, { pid: this.pid });
        try {
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
                log.error(`${e.message}\n${e.stack}`);
                this.next({ judge_text: `${e.message}\n${e.stack}\n${JSON.stringify(e.params)}` });
                this.end({
                    status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0,
                });
            }
        }
        fs.removeSync(this.tmpdir);
    }

    dir(p) {
        return path.resolve(this.tmpdir, p);
    }

    async submission() {
        this.stat.cache_start = new Date();
        this.folder = await this.session.problemData(
            this.submission.problem_id,
            this.submission.problem_mtime,
        );
        await this.session.uoj_download(this.submission.content.file_name, this.dir('all.zip'));
        await new Promise((resolve, reject) => {
            child.exec(`unzip ${this.dir('all.zip')} -d ${this.dir('all')}`, (e) => {
                if (e) reject(e);
                else resolve();
            });
        });
        this.code = await fsp.readFile(this.dir('all/answer.code'));
        this.stat.read_cases = new Date();
        this.config = await readCases(this.folder, { detail: this.session.config.detail });
        this.stat.judge = new Date();
        await judge[this.config.type || 'default'].judge(this);
    }

    async next(data) {
        console.log('next', data);
        if (data.compiler_text) this.details.compiler_text.push(data.compiler_text);
        if (data.judge_text) this.details.judge_text.push(data.judge_text);
        if (data.case) this.details.cases.push(data.case);
        return {};
    }

    async end(result) {
        if (result.compiler_text) this.details.compiler_text.push(result.compiler_text);
        if (result.judge_text) this.details.judge_text.push(result.judge_text);
        if (result.case) this.details.cases.push(result.case);
        if (result.status) this.details.status = result.status;
        console.log('end', result);
        const data = {
            submit: true,
            result: {},
        };
        if (this.submission.is_hack) {
            data.is_hack = true;
            data.id = this.submission.hack.id;
            // if (result != false && result.score)
            //     try {
            //         files = {
            //             'hack_input': fs.createReadStream(this.dir('hack_input.txt')),
            //             'std_output': fs.createReadStream(this.dir('std_output.txt'))
            //         };
            //     } catch (e) {
            //         result = false;
            //     }
        } else if (this.submission.is_custom_test) {
            data.is_custom_test = true;
            data.id = this.submission.id;
        } else { data.id = this.submission.id; }
        data.result.score = result.score;
        data.result.time = result.time_ms;
        data.result.memory = result.memory_kb;
        if (result.status === STATUS_SYSTEM_ERROR) {
            data.result.error = 'Judgement Failed';
            data.result.details = this.details || '';
        }
        data.result.status = 'Judged';
        data.result = JSON.stringify(data.result);
        const res = await this.session.axios.post('/judge/submit', data);
        this.session.consume();
        return res.data;
    }
}

module.exports = class UOJ {
    constructor(config) {
        this.config = config;
        assert(config.server_url);
        assert(config.uname);
        assert(config.password);
        if (!this.config.server_url.startsWith('http')) this.config.server_url = `http://${this.config.server_url}`;
    }

    async download(uri, file) {
        const res = await this.axios.post(`/judge/download${uri}`, {}, { responseType: 'stream' });
        const w = fs.createWriteStream(file);
        res.data.pipe(w);
        return await new Promise((resolve, reject) => {
            w.on('finish', resolve);
            w.on('error', reject);
        });
    }

    async init() {
        const { uname, password } = this.config;
        this.axios = axios.create({
            baseURL: this.config.server_url,
            timeout: this.config.timeout || 3000,
            transformRequest: [
                (data) => {
                    Object.assign(data, {
                        judge_name: uname,
                        password,
                    });
                    let ret = '';
                    for (const it in data) {
                        ret += `${encodeURIComponent(it)}=${encodeURIComponent(data[it])}&`;
                    }
                    return ret;
                },
            ],
        });
    }

    async problemData(pid, version) {
        const filePath = path.join(CACHE_DIR, this.config.host, pid.toString());
        if (fs.existsSync(filePath)) {
            let ver;
            try {
                ver = fs.readFileSync(path.join(filePath, 'version')).toString();
            } catch (e) { /* ignore */ }
            if (version === ver) return `${filePath}/${pid}`;
            fs.removeSync(filePath);
        }
        log.info(`Getting problem data: ${this.config.host}/${pid}`);
        const tmpFilePath = path.resolve(CACHE_DIR, `download_${this.config.host}_${pid}`);
        await this.download(`/problem/${pid}`, tmpFilePath);
        fs.ensureDirSync(path.dirname(filePath));
        await new Promise((resolve, reject) => {
            child.exec(`unzip ${tmpFilePath} -d ${filePath}`, (e) => {
                if (e) reject(e);
                else resolve();
            });
        });
        await fsp.unlink(tmpFilePath);
        fs.writeFileSync(path.join(filePath, 'version'), version);
        return `${filePath}/${pid}`;
    }

    async consume(queue) {
        if (queue) this.queue = queue;
        const ret = await this.axios.post('/judge/submit', {});
        if (ret.data === 'Nothing to judge') setTimeout(() => { this.consume(); }, 1000);
        else this.queue.push(new JudgeTask(this, ret.data));
    }
};
