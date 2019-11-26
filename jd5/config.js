const
    os = require('os'),
    path = require('path');
module.exports = {
    CONFIG_DIR: path.resolve(os.homedir(), '.config', 'jd5'),
    CACHE_DIR: path.resolve(os.homedir(), '.cache', 'jd5'),
    SYSTEM_MEMORY_LIMIT_MB: 1024,
    SYSTEM_TIME_LIMIT_MS: 16000,
    SYSTEM_PROCESS_LIMIT: 8,
    RETRY_DELAY_SEC: 15,
    SANDBOX_ROOT: '/tmp/jd5',
    SANDBOX_POOL_COUNT: 2
};
