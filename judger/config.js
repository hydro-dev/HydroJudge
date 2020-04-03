const
    argv = require('minimist')(process.argv.slice(2)),
    log = require('./log'),
    { mkdirp } = require('./utils'),
    os = require('os'),
    child = require('child_process'),
    fs = require('fs'),
    path = require('path');
let config = {
    CONFIG_FILE: path.resolve(os.homedir(), '.config', 'hydro', 'judger.yaml'),
    LANGS_FILE: path.resolve(os.homedir(), '.config', 'hydro', 'langs.yaml'),
    CACHE_DIR: path.resolve(os.homedir(), '.cache', 'hydro', 'judger'),
    FILES_DIR: path.resolve(os.homedir(), '.cache', 'hydro', 'files', 'judger'),
    SYSTEM_MEMORY_LIMIT_MB: 1024,
    SYSTEM_TIME_LIMIT_MS: 16000,
    SYSTEM_PROCESS_LIMIT: 32,
    RETRY_DELAY_SEC: 15,
    TEMP_DIR: path.resolve(os.tmpdir(), 'hydro', 'judger'),
    EXECUTION_HOST: 'http://localhost:5050',
    changeDefault(name, from, to) {
        if (config[name] == from) config[name] == to;
    }
};

if (fs.existsSync(path.resolve(process.cwd(), '.env'))) {
    let env = {};
    let f = fs.readFileSync('.env').toString();
    for (let line of f) {
        let a = line.split('=');
        env[a[0]] = a[1];
    }
    Object.assign(process.env, env);
}

if (process.env.CONFIG_FILE || argv.config)
    config.CONFIG_FILE = path.resolve(process.env.CONFIG_FILE || argv.config);

if (process.env.LANGS_FILE || argv.langs)
    config.LANGS_FILE = path.resolve(process.env.LANGS_FILE || argv.langs);

if (process.env.TEMP_DIR || argv.tmp)
    config.TEMP_DIR = path.resolve(process.env.TEMP_DIR || argv.tmp);

if (process.env.CACHE_DIR || argv.cache)
    config.CACHE_DIR = path.resolve(process.env.CACHE_DIR || argv.cache);

if (process.env.FILES_DIR || argv.files)
    config.FILES_DIR = path.resolve(process.env.FILES_DIR || argv.files);

if (process.env.EXECUTION_HOST || argv.execute)
    config.EXECUTION_HOST = path.resolve(process.env.EXECUTION_HOST || argv.execute);

if (process.env.START_EXECUTOR_SERVER) {
    let p = child.spawn(path.resolve(__dirname, process.env.START_EXECUTOR_SERVER));
    p.stdout.on('data', data => {
        console.log(data.toString());
    });
    p.stderr.on('data', data => {
        console.log(data.toString());
    });
    global.onDestory.push(() => {
        p.emit('exit');
    });
}

if (!fs.existsSync(config.CONFIG_FILE)) {
    log.error('Config file not found.');
    process.exit(1);
}
if (!fs.existsSync(config.LANGS_FILE)) {
    if (!fs.existsSync(path.dirname(config.LANGS_FILE)))
        mkdirp(path.dirname(config.LANGS_FILE));
    if (fs.existsSync(path.resolve(process.cwd(), 'examples', 'langs.yaml'))) {
        log.error('Language file not found, using default.');
        fs.copyFileSync(path.resolve(process.cwd(), 'examples', 'langs.yaml'), config.LANGS_FILE);
    } else throw new Error('Language file not found');
}

module.exports = config;