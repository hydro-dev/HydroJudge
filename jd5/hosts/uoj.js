const
    axios = require('axios'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    assert = require('assert'),
    log = require('../log'),
    { mkdirp, rmdir, outputLimit } = require('../utils'),
    child = require('child_process'),
    { CACHE_DIR, TEMP_DIR } = require('../config'),
    { FormatError, CompileError } = require('../error'),
    readCases = require('../cases'),
    judger = require('../judger');

const
    STATUS_SYSTEM_ERROR = 0,
    STATUS_COMPILE_ERROR = 1;

const LANGS_MAP = {
    'C': 'c'
};

module.exports = class UOJ {
    constructor(config) {
        this.config = config;
        assert(config.server_url);
        assert(config.uname);
        assert(config.password);
        if (!this.config.server_url.startsWith('http')) this.config.server_url = 'http://' + this.config.server_url;
    }
    async uoj_download(uri, file) {
        let res = await this.axios.post('/judge/download' + uri, {}, { responseType: 'stream' });
        let w = fs.createWriteStream(file);
        res.data.pipe(w);
        return await new Promise((resolve, reject) => {
            w.on('finish', resolve);
            w.on('error', reject);
        });
    }
    async init() {
        let { uname, password } = this.config;
        this.axios = axios.create({
            baseURL: this.config.server_url,
            timeout: this.config.timeout || 3000,
            transformRequest: [
                function (data) {
                    Object.assign(data, {
                        judger_name: uname,
                        password: password
                    });
                    let ret = '';
                    for (let it in data)
                        ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&';
                    return ret;
                }
            ]
        });
    }
    async problem_data(pid, version) {
        let file_path = path.join(CACHE_DIR, this.config.host, pid.toString());
        if (fs.existsSync(file_path)) {
            let ver;
            try {
                ver = fs.readFileSync(path.join(file_path, 'version')).toString();
            } catch (e) { /* ignore */ }
            if (version == ver) return `${file_path}/${pid}`;
            else rmdir(file_path);
        }
        log.info(`Getting problem data: ${this.config.host}/${pid}`);
        let tmp_file_path = path.resolve(CACHE_DIR, `download_${this.config.host}_${pid}`);
        await this.uoj_download(`/problem/${pid}`, tmp_file_path);
        await mkdirp(path.dirname(file_path));
        await new Promise((resolve, reject) => {
            child.exec(`unzip ${tmp_file_path} -d ${file_path}`, e => {
                if (e) reject(e);
                else resolve();
            });
        });
        await fsp.unlink(tmp_file_path);
        fs.writeFileSync(path.join(file_path, 'version'), version);
        return `${file_path}/${pid}`;
    }
    async record_pretest_data(rid, save_path) {
        log.info(`Getting pretest data: ${this.config.host}/${rid}`);
        let tmp_file_path = path.resolve(CACHE_DIR, `download_${this.config.host}_${rid}`);
        await fsp.unlink(tmp_file_path);
        await this.process_data(save_path);
        return save_path;
    }
    async consume(queue) {
        if (queue) this.queue = queue;
        let ret = await this.axios.post('/judge/submit', {});
        if (ret.data == 'Nothing to judge') setTimeout(() => { this.consume(); }, 1000);
        else this.queue.push(new JudgeTask(this, ret.data));
    }
};

class JudgeTask {
    constructor(session, submission) {
        console.log(submission.content);
        this.session = session;
        this.submission = submission;
    }
    async handle(pool) {
        this.pool = pool;
        this.host = this.session.config.host;
        this.rid = this.submission.id;
        this.pid = this.submission.problem_id;
        this.problem_mtime = this.submission.problem_mtime;
        for (let i of this.submission.content.config)
            if (i[0] == 'answer_language') this.lang = LANGS_MAP[i[1]];
        this.tmpdir = path.resolve(TEMP_DIR, this.host, this.rid.toString());
        fs.mkdirSync(this.tmpdir, { recursive: true });
        log.submission(`${this.host}/${this.rid}`, { pid: this.pid });
        try {
            await this.do_submission();
        } catch (e) {
            if (e instanceof CompileError) {
                this.next({ compiler_text: outputLimit(e.stdout, e.stderr) });
                this.end({ status: STATUS_COMPILE_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            } else if (e instanceof FormatError) {
                this.next({ judge_text: e.message + '\n' + JSON.stringify(e.params) });
                this.end({ status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            } else {
                log.error(e.message + '\n' + e.stack);
                this.next({ judge_text: e.message + '\n' + e.stack + '\n' + JSON.stringify(e.params) });
                this.end({ status: STATUS_SYSTEM_ERROR, score: 0, time_ms: 0, memory_kb: 0 });
            }
        }
        await rmdir(path.resolve(TEMP_DIR, this.host, this.rid.toString()));
    }
    dir(p) {
        return path.resolve(this.tmpdir, p);
    }
    async do_submission() {
        this.folder = await this.session.problem_data(this.submission.problem_id, this.submission.problem_mtime);
        await this.session.uoj_download(this.submission.content.file_name, this.dir('all.zip'));
        await new Promise((resolve, reject) => {
            child.exec(`unzip ${this.dir('all.zip')} -d ${this.dir('all')}`, e => {
                if (e) reject(e);
                else resolve();
            });
        });
        this.code = await fsp.readFile(this.dir('all/answer.code'));
        if (this.submission.is_hack) {
            if (this.submission.hack.input_type == 'USE_FORMATTER') {
                await this.session.download(this.submission.hack.input, this.dir('hack_input_raw.txt'));
                let sandbox;
                try {
                    [sandbox] = await this.pool.get();
                    let res = await sandbox.run(
                        this.dir('formatter'),
                        { stdin: this.dir('hack_input_raw.txt'), stdout: this.dir('hack_input.txt'), stderr: '/dev/null' }
                    );
                    if (res.code) throw new Error('Cannot format input');
                } finally {
                    if (sandbox) sandbox.free();
                }
            }
            else
                await this.session.download(this.submission.hack.input, this.dir('hack_input.txt'));
        }
        this.config = await readCases(this.folder, { detail: this.session.config.detail });
        await judger[this.config.type || 'default'].judge(this);
    }
    async next(data) {
        console.log('next', data);
        let req = {
            'update-status': true,
            id : this.submission.id,
            status: ''
        };
        let res = await this.session.axios.post('/judge/submit', req);
        return res.data;
    }
    async end(data) {
        console.log('end', data);
        let res = await this.session.axios.post('/judge/submit', data);
        this.session.consume();
        return res.data;
    }
}
