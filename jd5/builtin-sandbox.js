const
    { SystemError } = require('./error.js'),
    child = require('child_process'),
    path = require('path'),
    
    mkdirp = require('mkdirp'),
    log = require('./log'),
    fs = require('fs');

module.exports = class VIJOS_SANDBOX {
    constructor(name) {
        if (!name) name = 'jd5';
        if (typeof name != 'string') throw new SystemError('Typeof sandbox_name should be string, receive ' + (typeof name));
        this.dir = path.resolve('/tmp/jd5', name);
        if (!fs.existsSync(this.dir)) mkdirp(this.dir);
        if (!fs.existsSync(`${this.dir}/jd5.lock`))
            fs.writeFileSync(`${this.dir}/jd5.lock`, process.pid);
        else {
            //TODO(masnn) check if the pid exited.
            throw new Error('Sandbox dir locked!');
        }
    }
    mount(src, dst) {
        // ???
    }
    spawn(file, argv, config) {
        log.log('Running: ', file, argv, config);
        if (this.process) throw new SystemError('Already running a process!');
        let stdin = null, stdout = null, stderr = null;
        if (config.stdin) stdin = fs.createReadStream(config.stdin);
        if (config.stdout) {
            fs.writeFileSync(config.stdout, '');
            stdout = fs.createWriteStream(config.stdout);
        }
        if (config.stderr) {
            fs.writeFileSync(config.stderr, '');
            stderr = fs.createWriteStream(config.stderr);
        }
        if (!fs.existsSync(file)) file = path.resolve(this.dir, 'home', file);
        this.process = child.spawn(file, argv, {
            stdio: [stdin, stdout, stderr], cwd: path.resolve(this.dir, 'home')
        });
        this.process.on('exit', () => { this.process = null; });
        return this.process;
    }
    wait() {
        if (!this.process) throw new SystemError('Process not started');
        return new Promise((resolve, reject) => {
            this.process.once('exit', (code, signal) => {
                this.process = null;
                resolve({ code, signal });
            });
            this.process.once('error', err => {
                this.process = null;
                reject(err);
            });
        });
    }
    kill() {
        this.process.kill('SIGKILL');
        this.process = null;
    }
};
