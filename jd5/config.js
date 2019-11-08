const
    os = require('os'),
    path = require('path');
module.exports = {
    CONFIG_DIR: path.resolve(os.homedir(), '.config', 'jd5'),
    CACHE_DIR: path.resolve(os.homedir(), '.cache', 'jd5'),
    SYSTEM_MEMORY_LIMIT_MB: 512,
    SYSTEM_TIME_LIMIT_MS: 10000,
    SYSTEM_PROCESS_LIMIT: 8,
    RETRY_DELAY_SEC: 30,
    SANDBOX_ROOT: '/tmp/jd5',
    SANDBOX_ENV: 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    SANDBOX_MOUNT: [
        '/usr/bin', '/bin', '/lib', '/usr/include', '/usr/local/lib', '/usr/lib64',
        '/usr/libexec', '/usr/share', '/var/lib', '/opt/kotlin', '/etc/alternatives',
        '/etc/java', '/etc/python', '/etc/fpc'
    ]
};
