const
    { SystemError } = require('../error.js'),
    os = require('os'),
    sandbox = require('../../simple-sandbox'),
    log = require('../log');

module.exports = class SIMPLE_SANDBOX {
    constructor(name) {
        if (!name) name = 'jd5';
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
    }
    mount(src, dst, readonly) {
        this.mounts.push({ src, dst, limit: readonly ? 0 : -1 });
    }
    async execute(config) {
        if (this.process) throw new SystemError('Already running a process!');
        this.process = await sandbox.startSandbox({
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
        });
        let result = await this.process.waitForStop();
        this.process = null;
        if (result.code == 126) throw new SystemError('Executable file not found!');
        return result;
    }
};
