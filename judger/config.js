const
    argv = require('minimist')(process.argv.slice(2)),
    log = require('./log'),
    { mkdirp } = require('./utils'),
    os = require('os'),
    fs = require('fs'),
    path = require('path');
let config = {
    CONFIG_FILE: path.resolve(os.homedir(), '.config', 'hydro', 'judger.yaml'),
    LANGS_FILE: path.resolve(os.homedir(), '.config', 'hydro', 'langs.yaml'),
    CACHE_DIR: path.resolve(os.homedir(), '.cache', 'hydro', 'judger'),
    SYSTEM_MEMORY_LIMIT_MB: 1024,
    SYSTEM_TIME_LIMIT_MS: 16000,
    SYSTEM_PROCESS_LIMIT: 32,
    RETRY_DELAY_SEC: 15,
    TEMP_DIR: path.resolve(os.tmpdir(), 'hydro', 'judger'),
    EXECUTION_HOST: 'http://localhost:5050'
};
if (argv.config) config.CONFIG_FILE = path.resolve(argv.config);
if (argv.langs) config.LANGS_FILE = path.resolve(argv.langs);
if (argv.tmp) config.TMP_DIR = path.resolve(argv.tmp);
if (!fs.existsSync(config.CONFIG_FILE)) {
    log.error('Config file not found.');
    process.exit(1);
}
if (!fs.existsSync(config.LANGS_FILE)) {
    log.error('Language file not found, using default.');
    if (!fs.existsSync(path.dirname(config.LANGS_FILE)))
        mkdirp(path.dirname(config.LANGS_FILE));
    fs.copyFileSync(path.resolve(process.cwd(), 'examples', 'langs.yaml'), config.LANGS_FILE);
}

module.exports = config;