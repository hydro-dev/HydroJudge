const
    sb = require('jd5-sandbox'),
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    { mkdirp } = require('./utils'),
    { SYSTEM_TIME_LIMIT_MS, SYSTEM_MEMORY_LIMIT_MB, SYSTEM_PROCESS_LIMIT } = require('./config'),
    mounts = [
        '/usr/bin', '/bin', '/lib', '/usr/include', '/usr/local/lib', '/usr/lib64',
        '/usr/libexec', '/usr/share', '/var/lib', '/opt/kotlin', '/etc/alternatives',
        '/etc/java', '/etc/python', '/etc/fpc'
    ];

if (!fs.existsSync('/opt/jd5/sandbox')) mkdirp('/opt/jd5/sandbox');
if (!fs.existsSync('/opt/jd5/root')) mkdirp('/opt/jd5/root');
if (!fs.existsSync('/opt/jd5/bin')) mkdirp('/opt/jd5/bin');

module.exports = class SandBox {
    constructor(name) {
        this.name = name;
        this.root = '/opt/jd5/root';
        this.dir = `/opt/jd5/sandbox/${this.name}`;
        if (!fs.existsSync(`${this.dir}/jd5.lock`))
            fs.writeFileSync(`${this.dir}/jd5.lock`, process.pid);
        else throw new Error('Sandbox dir locked!');
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
        if (!fs.existsSync(`${this.dir}/stdin`))
            fs.writeFileSync(`${this.dir}/stdin`, '');
        if (!fs.existsSync(`${this.dir}/stdout`))
            fs.writeFileSync(`${this.dir}/stdout`, '');
        if (!fs.existsSync(`${this.dir}/stderr`))
            fs.writeFileSync(`${this.dir}/stderr`, '');
        this.mounts = [{ src: `${this.dir}/home`, dst: '/home', limit: -1 }];
        for (let i in mounts)
            if (fs.existsSync(mounts[i])) {
                if (!fs.existsSync(this.root + mounts[i]))
                    await mkdirp(this.root + mounts[i]);
                this.mounts.push({ src: mounts[i], dst: mounts[i], limit: 0 });
            }
    }
    async close() {
        if (this.process)
            try {
                process.kill(this.process.pid);
            } catch (e) {
                if (e.code != 'ESRCH') console.log(e);
            }
        await fsp.unlink(`${this.dir}/jd5.lock`);
    }
    async run({
        time_limit_ms = SYSTEM_TIME_LIMIT_MS,
        memory_limit_mb = SYSTEM_MEMORY_LIMIT_MB,
        process_limit = SYSTEM_PROCESS_LIMIT,
        cache = [], execute = [], stdin = 'stdin', stdout = 'stdout', stderr = 'stderr'
    } = {}) {
        let result;
        for (let i in cache)
            await fsp.copyFile(path.resolve(this.dir, 'cache', cache[i]), path.resolve(this.dir, 'home', cache[i]));
        try {
            this.config = {
                chroot: '/opt/jd5/root',
                mounts: this.mounts,
                executable: execute[0],
                parameters: execute,
                environments: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
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
            console.log(this.config);
            this.process = await sb.startSandbox(this.config);
            console.log('Sandbox started.');
            let result = await this.process.waitForStop();
            console.log('Your sandbox finished!', result);
        } catch (ex) {
            console.log('Whooops! ', ex);
        }
        return result;
    }
    stdin() {
        return fs.createWriteStream(path.resolve(this.dir, 'stdin'));
    }
    stdout() {
        return fs.createReadStream(path.resolve(this.dir, 'stdout'));
    }
    stderr() {
        return fs.createReadStream(path.resolve(this.dir, 'stderr'));
    }
};
