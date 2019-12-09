const
    log = require('./log'),
    os = require('os'),
    fs = require('fs'),
    path = require('path');
let config = {
    CONFIG_DIR: [path.resolve(os.homedir(), '.config', 'jd5'), path.resolve('.')],
    CACHE_DIR: path.resolve(os.homedir(), '.cache', 'jd5'),
    SYSTEM_MEMORY_LIMIT_MB: 1024,
    SYSTEM_TIME_LIMIT_MS: 16000,
    SYSTEM_PROCESS_LIMIT: 8,
    RETRY_DELAY_SEC: 15,
    SANDBOX_ROOT: '/tmp/jd5',
    SANDBOX_POOL_COUNT: 2
};

for (let i of config.CONFIG_DIR) {
    if (fs.existsSync(path.resolve(i, 'config.yaml')))
        config.CONFIG_FILE = path.resolve(i, 'config.yaml');
    if (fs.existsSync(path.resolve(i, 'langs.yaml')))
        config.LANGS_FILE = path.resolve(i, 'langs.yaml');
}
if (!config.CONFIG_FILE) {
    log.error('Config file not found.');
    process.exit(1);
}
if (!config.LANGS_FILE) {
    config.LANGS_FILE = path.resolve(config.CONFIG_DIR[0], 'langs.yaml');
    log.error('Language file not found, using default.');
    if (!fs.existsSync(os.homedir() + '/.config/jd5')) {
        if (!fs.existsSync(os.homedir() + '/.config'))
            fs.mkdirSync(os.homedir() + '/.config');
        fs.mkdirSync(os.homedir() + '/.config/jd5');
    }
    fs.copyFileSync(path.resolve(__dirname, '../examples/langs.yaml'), config.LANGS_FILE);
}

module.exports = config;