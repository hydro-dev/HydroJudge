const
    sb = require('./builtin-sandbox.js'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    { mkdirp, rmdir, parseFilename } = require('./utils'),
    { SystemError } = require('./error'),
    log = require('./log'),
    { SYSTEM_TIME_LIMIT_MS, SYSTEM_MEMORY_LIMIT_MB, SYSTEM_PROCESS_LIMIT } = require('./config');

module.exports = class SandBox {
    constructor(name) {
        this.name = name;
        this.sandbox = new sb(name);
        this.dir = this.sandbox.dir;
    }
    async init() {
        if (!fs.existsSync(`${this.dir}/home`))
            await new Promise(resolve => {
                mkdirp(`${this.dir}/home`, resolve());
            });
        global.onDestory.push(() => this.close());
    }
    async close() {
        await fsp.unlink(path.resolve(this.sandbox.dir, 'jd5.lock'));
    }
    async reset() {
        await this.clean();
        rmdir(path.join(this.sandbox.dir, 'cache'), true);
        mkdirp(path.join(this.sandbox.dir, 'cache'));
    }
    async clean() {
        rmdir(path.join(this.sandbox.dir, 'home'), true);
        mkdirp(path.join(this.sandbox.dir, 'home'));
    }
    async addFile(src, target) {
        if (!src) throw new SystemError('Error while parsing source');
        if (!target) target = parseFilename(src);
        if (typeof target == 'number') {
            //file descriptor
        } else if (typeof target == 'string') {
            //path in sandbox
            await fsp.symlink(path.join(this.sandbox.dir, 'home', target), src);
        } else throw new SystemError('Error while parsing target');
    }
    async writeFile(target, file) {
        return await fsp.writeFile(path.resolve(this.dir, 'home', target), file);
    }
    async saveFile(src) {
        await fsp.copyFile(path.resolve(this.sandbox.dir, 'home', src), path.resolve(this.sandbox.dir, 'cache', src));
    }
    async run(file, params, {
        time_limit_ms = SYSTEM_TIME_LIMIT_MS,
        memory_limit_mb = SYSTEM_MEMORY_LIMIT_MB,
        process_limit = SYSTEM_PROCESS_LIMIT,
        stdin, stdout, stderr
    } = {}) {
        let config = {
            stdin, stdout, stderr,
            time: time_limit_ms,
            memory: memory_limit_mb * 1024 * 1024,
            process: process_limit
        };
        log.log(config);
        this.process = await this.sandbox.spawn(file, params, config);
        let result = await this.sandbox.wait();
        log.log('Your sandbox finished!', result);
        return result || { code: -1 };
    }

};
