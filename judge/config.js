const argv = require('minimist')(process.argv.slice(2));
const os = require('os');
const child = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const log = require('./log');

const config = {
    CONFIG_FILE: path.resolve(os.homedir(), '.config', 'hydro', 'judge.yaml'),
    LANGS_FILE: path.resolve(os.homedir(), '.config', 'hydro', 'langs.yaml'),
    CACHE_DIR: path.resolve(os.homedir(), '.cache', 'hydro', 'judge'),
    FILES_DIR: path.resolve(os.homedir(), '.cache', 'hydro', 'files', 'judge'),
    SYSTEM_MEMORY_LIMIT_MB: 1024,
    SYSTEM_TIME_LIMIT_MS: 16000,
    SYSTEM_PROCESS_LIMIT: 32,
    RETRY_DELAY_SEC: 15,
    TEMP_DIR: path.resolve(os.tmpdir(), 'hydro', 'judge'),
    EXECUTION_HOST: 'http://localhost:5050',
    CONFIG: null,
    LANGS: null,
    changeDefault(name, from, to) {
        if (config[name] === from) config[name] = to;
    },
};

if (fs.existsSync(path.resolve(process.cwd(), '.env'))) {
    const env = {};
    const f = fs.readFileSync('.env').toString();
    for (const line of f) {
        const a = line.split('=');
        env[a[0]] = a[1];
    }
    Object.assign(process.env, env);
}

if (process.env.CONFIG_FILE || argv.config) {
    config.CONFIG_FILE = path.resolve(process.env.CONFIG_FILE || argv.config);
}
if (process.env.LANGS_FILE || argv.langs) {
    config.LANGS_FILE = path.resolve(process.env.LANGS_FILE || argv.langs);
}
if (process.env.TEMP_DIR || argv.tmp) {
    config.TEMP_DIR = path.resolve(process.env.TEMP_DIR || argv.tmp);
}
if (process.env.CACHE_DIR || argv.cache) {
    config.CACHE_DIR = path.resolve(process.env.CACHE_DIR || argv.cache);
}
if (process.env.FILES_DIR || argv.files) {
    config.FILES_DIR = path.resolve(process.env.FILES_DIR || argv.files);
}
if (process.env.EXECUTION_HOST || argv.execute) {
    config.EXECUTION_HOST = path.resolve(process.env.EXECUTION_HOST || argv.execute);
}
if (process.env.START_EXECUTOR_SERVER) {
    const args = (process.env.EXECUTOR_SERVER_ARGS || '').split(' ');
    console.log('Starting executor server with args', args);
    const p = child.spawn(path.resolve(__dirname, process.env.START_EXECUTOR_SERVER), args);
    if (!p.stdout) throw new Error('Cannot start executorserver');
    else {
        p.stdout.on('data', (data) => {
            const s = data.toString();
            console.log(s.substr(0, s.length - 1));
        });
        p.stderr.on('data', (data) => {
            const s = data.toString();
            console.log(s.substr(0, s.length - 1));
        });
        global.onDestory.push(() => {
            p.emit('exit');
        });
    }
    p.on('error', (error) => console.error(error));
}
if (!(fs.existsSync(config.LANGS_FILE) || global.Hydro)) {
    fs.ensureDirSync(path.dirname(config.LANGS_FILE));
    if (fs.existsSync(path.join(__dirname, '..', 'examples', 'langs.yaml'))) {
        log.error('Language file not found, using default.');
        config.LANGS_FILE = path.join(__dirname, '..', 'examples', 'langs.yaml');
    } else throw new Error('Language file not found');
}

module.exports = config;
