const
    EventEmitter = require('events'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    { mkdirp, rmdir, parseFilename, cmd } = require('./utils'),
    { SystemError } = require('./error'),
    log = require('./log'),
    os = require('os'),
    { SYSTEM_TIME_LIMIT_MS, SYSTEM_MEMORY_LIMIT_MB, SYSTEM_PROCESS_LIMIT } = require('./config');

module.exports = class SandBox extends EventEmitter {
    constructor(name, type = 'simple-sandbox') {
        super();
        this.name = name;
        this.SandBox = require(path.resolve(__dirname, 'sandbox', type));
        this.sandbox = new this.SandBox(name);
        this.dir = `${os.tmpdir()}/jd5/${name}`;
    }
    async init() {
        log.log(`Sandbox init: ${this.dir}`);
        if (!fs.existsSync(`${this.dir}`))
            await new Promise(resolve => {
                mkdirp(`${this.dir}`, resolve());
            });
        if (!fs.existsSync(`${this.dir}/home`))
            await new Promise(resolve => {
                mkdirp(`${this.dir}/home`, resolve());
            });
        if (!fs.existsSync(`${this.dir}/cache`))
            await new Promise(resolve => {
                mkdirp(`${this.dir}/cache`, resolve());
            });
        if (!fs.existsSync(`${this.dir}/tmp`))
            await new Promise(resolve => {
                mkdirp(`${this.dir}/tmp`, resolve());
            });
        if (!fs.existsSync(`${this.dir}/jd5.lock`))
            fs.writeFileSync(`${this.dir}/jd5.lock`, process.pid);
        else {
            //TODO(masnn) check if the pid exited.
            throw new Error('Sandbox dir locked!');
        }
        global.onDestory.push(() => this.close());
    }
    async close() {
        await fsp.unlink(path.resolve(this.dir, 'jd5.lock'));
    }
    async reset() {
        await this.clean();
        rmdir(path.join(this.dir, 'cache'), true);
        mkdirp(path.join(this.dir, 'cache'));
    }
    async clean() {
        rmdir(path.join(this.dir, 'home'), true);
        mkdirp(path.join(this.dir, 'home'));
    }
    async addFile(src, target) {
        if (!src) throw new SystemError('Error while parsing source');
        if (!target) target = parseFilename(src);
        if (typeof target == 'number') {
            //file descriptor
        } else if (typeof target == 'string') {
            //path in sandbox
            await fsp.copyFile(src, path.join(this.dir, 'home', target));
        } else throw new SystemError('Error while parsing target');
    }
    writeFile(file, content) {
        return fsp.writeFile(path.resolve(this.dir, 'home', file), content);
    }
    async saveFile(src) {
        await fsp.copyFile(path.resolve(this.dir, 'home', src), path.resolve(this.dir, 'cache', src));
    }
    async command(command) {
        this.run(command, { stdout: '/tmp/stdout', stderr: '/tmp/stderr' });
    }
    async run(execute, {
        time_limit_ms = SYSTEM_TIME_LIMIT_MS,
        memory_limit_mb = SYSTEM_MEMORY_LIMIT_MB,
        process_limit = SYSTEM_PROCESS_LIMIT,
        stdin, stdout, stderr
    } = {}) {
        if (execute[0] == '.') execute = execute.replace('.', this.dir + '/home');
        let params = cmd(execute);
        let result = await this.sandbox.execute({
            file: params[0], params,
            cwd: path.resolve(this.dir, 'home'),
            stdin, stdout, stderr,
            time: time_limit_ms,
            memory: memory_limit_mb * 1024 * 1024,
            process: process_limit
        });
        return result || { code: -1, time_ms: 0, memory_kb: 0 };
    }
    async free() {
        await this.reset();
        this.emit('free');
    }
};
