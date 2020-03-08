const
    axios = require('axios'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    assert = require('assert'),
    log = require('../log'),
    { mkdirp, rmdir, compilerText } = require('../utils'),
    child = require('child_process'),
    { CACHE_DIR, TEMP_DIR } = require('../config'),
    { FormatError, CompileError } = require('../error'),
    { STATUS_COMPILE_ERROR, STATUS_SYSTEM_ERROR } = require('../status'),
    readCases = require('../cases'),
    judger = require('../judger');

const LANGS_MAP = {
    'C': 'c',
    'C++': 'cc98',
    'C++11': 'cc11',
    'Java8': 'java',
    'Java11': 'java',
    'Pascal': 'pas',
    'Python2': 'py2',
    'Python3': 'py3'
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
        mkdirp(path.dirname(file_path));
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
        for (let i of this.submission.content.config)
            if (i[0] == 'answer_language') this.lang = LANGS_MAP[i[1]];
        this.tmpdir = path.resolve(TEMP_DIR, 'tmp', this.host, this.rid.toString());
        this.details = {
            cases: [],
            compiler_text: [],
            judge_text: []
        };
        mkdirp(this.tmpdir);
        log.submission(`${this.host}/${this.rid}`, { pid: this.pid });
        try {
            await this.do_submission();
        } catch (e) {
            if (e instanceof CompileError) {
                this.next({ compiler_text: compilerText(e.stdout, e.stderr) });
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
        await rmdir(this.tmpdir);
    }
    dir(p) {
        return path.resolve(this.tmpdir, p);
    }
    async do_submission() {
        this.stat.cache_start = new Date();
        this.folder = await this.session.problem_data(this.submission.problem_id, this.submission.problem_mtime);
        await this.session.uoj_download(this.submission.content.file_name, this.dir('all.zip'));
        await new Promise((resolve, reject) => {
            child.exec(`unzip ${this.dir('all.zip')} -d ${this.dir('all')}`, e => {
                if (e) reject(e);
                else resolve();
            });
        });
        this.code = await fsp.readFile(this.dir('all/answer.code'));
        this.stat.read_cases = new Date();
        this.config = await readCases(this.folder, { detail: this.session.config.detail });
        this.stat.judge = new Date();
        await judger[this.config.type || 'default'].judge(this);
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
        let data = {
            submit: true,
            result: {}
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
        } else
            data.id = this.submission.id;
        data.result.score = result.score;
        data.result.time = result.time_ms;
        data.result.memory = result.memory_kb;
        if (result.status == STATUS_SYSTEM_ERROR) {
            data.result.error = 'Judgement Failed';
            data.result.details = this.details || '';
        }
        data.result.status = 'Judged';
        data.result = JSON.stringify(data.result);
        let res = await this.session.axios.post('/judge/submit', data);
        this.session.consume();
        return res.data;
    }
}

/*

res = {}
	with open(uoj_judger_path('/result/result.txt'), 'r') as fres:
		res['score'] = 0
		res['time'] = 0
		res['memory'] = 0
		while True:
			line = fres.readline()
			if line == '':
				break
			line = line.strip()
			if line == 'details':
				res['details'] = fres.read()
				break

			sp = line.split()
			assert len(sp) >= 1
			if sp[0] == 'error':
				res['error'] = line[len('error') + 1:]
			else:
				assert len(sp) == 2
				res[sp[0]] = sp[1]
		res['score'] = int(res['score'])
		res['time'] = int(res['time'])
		res['memory'] = int(res['memory'])
	res['status'] = 'Judged'
	return res

void end_judge_ok() {
	FILE *fres = fopen((result_path + "/result.txt").c_str(), "w");
	fprintf(fres, "score %d\n", tot_score);
	fprintf(fres, "time %d\n", tot_time);
	fprintf(fres, "memory %d\n", max_memory);
	fprintf(fres, "details\n");
	fprintf(fres, "<tests>\n");
	fprintf(fres, "%s", details_out.str().c_str());
	fprintf(fres, "</tests>\n");
	fclose(fres);
	exit(0);
}
void end_judge_judgement_failed(const string &info) {
	FILE *fres = fopen((result_path + "/result.txt").c_str(), "w");
	fprintf(fres, "error Judgement Failed\n");
	fprintf(fres, "details\n");
	fprintf(fres, "<error>%s</error>\n", htmlspecialchars(info).c_str());
	fclose(fres);
	exit(1);
}
void end_judge_compile_error(const RunCompilerResult &res) {
	FILE *fres = fopen((result_path + "/result.txt").c_str(), "w");
	fprintf(fres, "error Compile Error\n");
	fprintf(fres, "details\n");
	fprintf(fres, "<error>%s</error>\n", htmlspecialchars(res.info).c_str());
	fclose(fres);
	exit(0);
}

void report_judge_status(const char *status) {
	FILE *f = fopen((result_path + "/cur_status.txt").c_str(), "a");
	if (f == NULL) {
		return;
	}
	if (flock(fileno(f), LOCK_EX) != -1) {
		if (ftruncate(fileno(f), 0) != -1) {
			fprintf(f, "%s\n", status);
			fflush(f);
		}
		flock(fileno(f), LOCK_UN);
	}
	fclose(f);
}
bool report_judge_status_f(const char *fmt, ...) {
	const int MaxL = 512;
	char status[MaxL];
	va_list ap;
	va_start(ap, fmt);
	int res = vsnprintf(status, MaxL, fmt, ap);
	if (res < 0 || res >= MaxL) {
		return false;
	}
	report_judge_status(status);
	va_end(ap);
	return true;
}
*/
