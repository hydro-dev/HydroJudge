const
    sb = require('vijos-sandbox'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    { mkdirp, rmdir, parseFilename } = require('./utils'),
    { SystemError } = require('./error'),
    log = require('./log'),
    { SYSTEM_TIME_LIMIT_MS, SYSTEM_MEMORY_LIMIT_MB, SYSTEM_PROCESS_LIMIT, SANDBOX_ROOT } = require('./config'),
    { SANDBOX_MOUNTS } = require('./config');

module.exports = class SandBox {
    constructor(name) {
        this.name = name;
        this.dir = path.resolve(SANDBOX_ROOT, this.name);
        if (!fs.existsSync(this.dir)) mkdirp(this.dir);
        if (!fs.existsSync(`${this.dir}/jd5.lock`))
            fs.writeFileSync(`${this.dir}/jd5.lock`, process.pid);
        else {
            //TODO(masnn) check if the pid exited.
            throw new Error('Sandbox dir locked!');
        }
        process.on('SIGINT', async () => {
            await this.close();
            process.exit(0);
        });
    }
    async init() {
        if (!fs.existsSync(`${this.dir}/home`))
            await new Promise(resolve => {
                mkdirp(`${this.dir}/home`, resolve());
            });
        this.mounts = [{ src: `${this.dir}/home`, dst: '/home', limit: -1 }];
    }
    async close() {
        log.log('Stopping sandbox');
        if (this.process)
            try {
                process.kill(this.process.pid);
            } catch (e) {
                if (e.code != 'ESRCH') log.log(e);
            }
        await fsp.unlink(`${this.dir}/jd5.lock`);
    }
    async reset() {
        await this.clean();
        rmdir(path.join(this.dir, 'cache'));
        mkdirp(path.join(this.dir, 'cache'));
    }
    async clean() {
        rmdir(path.join(this.dir, 'home'));
        mkdirp(path.join(this.dir, 'home'));
    }
    async addFile(src, target) {
        if (!src) throw new SystemError('Error while parsing source');
        if (!target) target = parseFilename(src);
        if (typeof target == 'number') {
            //file descriptor
        } else if (typeof target == 'string') {
            //path in sandbox
        } else throw new SystemError('Error while parsing target');
    }
    async saveFile(src) {
        //TODO
    }
    async run(file, params, {
        time_limit_ms = SYSTEM_TIME_LIMIT_MS,
        memory_limit_mb = SYSTEM_MEMORY_LIMIT_MB,
        process_limit = SYSTEM_PROCESS_LIMIT,
        stdin = '', stdout = '', stderr = ''
    } = {}) {
        let result;
        try {
            this.config = {
                mounts: this.mounts,
                environments: [''],
                stdin: `${this.dir}/${stdin}`,
                stdout: `${this.dir}/${stdout}`,
                stderr: `${this.dir}/${stderr}`,
                time: time_limit_ms,
                mountProc: true,
                redirectBeforeChroot: true,
                memory: memory_limit_mb * 1024 * 1024,
                process: process_limit,
                user: 'root',
                cgroup: this.name,
                workingDirectory: '/home'
            };
            log.log(this.config);
            this.process = await sb.startSandbox(this.config);
            log.log('Sandbox started.');
            let result = await this.process.waitForStop();
            log.log('Your sandbox finished!', result);
        } catch (ex) {
            log.log('Whooops! ', ex);
        }
        return result;
    }

};
