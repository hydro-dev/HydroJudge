const
    EventEmitter = require('events'),
    fs = require('fs'),
    fsp = fs.promises,
    tmpfs = require('./tmpfs'),
    path = require('path'),
    { mkdirp, cleandir, parseFilename, cmd } = require('./utils'),
    { SystemError } = require('./error'),
    log = require('./log'),
    os = require('os'),
    { SYSTEM_TIME_LIMIT_MS, SYSTEM_MEMORY_LIMIT_MB, SYSTEM_PROCESS_LIMIT } = require('./config'),
    sandbox = require('simple-sandbox2'),
    cgroupPath = '/sys/fs/cgroup';

const GetCgroupProperty = (ctrl, cgroup, prop) => {
    let file = path.resolve(cgroupPath, ctrl, cgroup, prop);
    if (!fs.existsSync(file)) throw new SystemError('Cgroup doesn\'t exist');
    return fs.readFileSync(file).toString();
};
const GetCgroupProperty2 = (ctrl, cgroup, prop, subprop) => {
    let file = path.resolve(cgroupPath, ctrl, cgroup, prop);
    if (!fs.existsSync(file)) throw new SystemError('Cgroup doesn\'t exist');
    let res = fs.readFileSync(file).toString().split('\n');
    for (let line of res) {
        let t = line.split(' ');
        if (t[0] == subprop) return t[1];
    }
    return null;
};
const removeCgroup = (ctrl, cgroup) => {
    let folder = path.resolve(cgroupPath, ctrl, cgroup);
    if (!fs.existsSync(folder)) throw new SystemError('Cgroup doesn\'t exist');
    let tasks = fs.readFileSync(path.resolve(folder, 'tasks')).toString().split(' ');
    for (let task of tasks)
        if (Number(task))
            process.kill(Number(task), 'SIGKILL');
    fs.rmdirSync(folder);
};
const createCgroup = (ctrl, cgroup) => {
    let folder = path.resolve(cgroupPath, ctrl, cgroup);
    fs.mkdirSync(folder, { recursive: true });
};
module.exports = class SANDBOX extends EventEmitter {
    constructor(name) {
        super();
        if (typeof name == 'number') name = name + '';
        if (typeof name != 'string') throw new SystemError('Typeof sandbox_name should be string, receive ' + (typeof name));
        this.mounts = [
            {
                src: `/tmp/jd5/${name}/home`,
                dst: '/home',
                limit: 1000
            }, {
                src: `/tmp/jd5/${name}/tmp`,
                dst: '/tmp',
                limit: 1000
            }
        ];
        this.name = name;
        this.dir = `${os.tmpdir()}/jd5/${name}`;
        createCgroup('memory', `jd5/${this.name}`);
        createCgroup('cpuacct', `jd5/${this.name}`);
        createCgroup('pids', `jd5/${this.name}`);
        global.onDestory.push(() => { this.destory(); });
    }
    async run(execute, {
        time_limit_ms = SYSTEM_TIME_LIMIT_MS,
        memory_limit_mb = SYSTEM_MEMORY_LIMIT_MB,
        process_limit = SYSTEM_PROCESS_LIMIT,
        stdin, stdout, stderr
    } = {}) {
        if (execute[0] == '.') execute = execute.replace('.', this.dir + '/home');
        let params = cmd(execute);
        let result = await this.execute({
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
    async init() {
        log.log(`Sandbox init: ${this.dir}`);
        if (!fs.existsSync(`${this.dir}`)) await mkdirp(`${this.dir}`);
        if (!fs.existsSync(`${this.dir}/home`)) await mkdirp(`${this.dir}/home`);
        if (!fs.existsSync(`${this.dir}/tmp`)) await mkdirp(`${this.dir}/tmp`);
        tmpfs.mount(`${this.dir}/home`);
        tmpfs.mount(`${this.dir}/tmp`);
    }
    async reset() {
        cleandir(path.join(this.dir, 'home'));
    }
    async clean() {
        cleandir(path.join(this.dir, 'home'));
    }
    async addFile(src, target) {
        if (!src) throw new SystemError('Error while parsing source');
        if (!target) target = parseFilename(src);
        await fsp.copyFile(src, path.join(this.dir, 'home', target));
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
    async execute(config) {
        if (this.pid) throw new SystemError('Already running a process!');
        const actualParameter = {
            time: config.time,
            memory: config.memory,
            process: config.process,
            environments: ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
            chroot: '/opt/sandbox/rootfs',
            mounts: this.mounts,
            redirectBeforeChroot: true,
            executable: config.file,
            stdin: config.stdin,
            stdout: config.stdout,
            stderr: config.stderr,
            user: os.userInfo().username,
            cgroup: `jd5/${this.name}`,
            parameters: config.params,
            workingDirectory: '/home',
            mountProc: true,
        };
        let result = await new Promise((res, rej) => {
            sandbox.StartChild(actualParameter, (err, result) => {
                if (err) rej(err);
                else res(result);
            });
        });
        this.pid = result.pid;
        this.countedCpuTime = 0;
        this.actualCpuTime = 0;
        const checkInterval = Math.min(config.time / 10, 50);
        let lastCheck = new Date().getTime();
        const checkIfTimedOut = () => {
            let current = new Date().getTime();
            const spent = current - lastCheck;
            lastCheck = current;
            const val = Number(GetCgroupProperty('cpuacct', `jd5/${this.name}`, 'cpuacct.usage'));
            this.countedCpuTime += Math.max(
                val - this.actualCpuTime,
                spent * 1000 * 1000 * 0.4
            );
            this.actualCpuTime = val;
            if (this.countedCpuTime > config.time * 1000 * 1000 * 1.1) this.stop();
        };
        this.cancellationToken = setInterval(checkIfTimedOut, checkInterval);
        result = await new Promise((res, rej) => {
            sandbox.WaitForProcess(this.pid, (err, runResult) => {
                if (err) rej(err);
                else {
                    const memUsageWithCache = Number(GetCgroupProperty('memory', `jd5/${this.name}`, 'memory.max_usage_in_bytes'));
                    const cache = Number(GetCgroupProperty2('memory', `jd5/${this.name}`, 'memory.stat', 'cache'));
                    const memUsage = memUsageWithCache - cache;
                    this.actualCpuTime = Number(GetCgroupProperty('cpuacct', `jd5/${this.name}`, 'cpuacct.usage'));
                    let result = {
                        time: this.actualCpuTime,
                        memory: memUsage,
                        code: runResult.code
                    };
                    res(result);
                }
            });
        });
        this.pid = null;
        await this.stop();
        result.time_usage_ms = Math.floor(result.time / 1000000);
        result.memory_usage_kb = result.memory / 1024;
        if (result.code == 126) throw new SystemError('Executable file not found!', [config]);
        return result;
    }
    async stop() {
        if (this.cancellationToken) {
            clearInterval(this.cancellationToken);
            this.cancellationToken = null;
        }
        if (Number(this.pid)) process.kill(Number(this.pid), 'SIGKILL');
        this.pid = null;
    }
    destory() {
        removeCgroup('memory', `jd5/${this.name}`);
        removeCgroup('cpuacct', `jd5/${this.name}`);
        removeCgroup('pids', `jd5/${this.name}`);
        tmpfs.umount(`${this.dir}/home`);
        tmpfs.umount(`${this.dir}/tmp`);
    }
};
