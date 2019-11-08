const
    path = require('path'),
    yaml = require('js-yaml'),
    fs = require('fs'),
    fsp = fs.promises,
    os = require('os'),
    { CompileError, SystemError } = require('./error'),
    log = require('./log'),
    { CONFIG_DIR } = require('./config'),
    _LANGS_FILE = path.join(CONFIG_DIR, 'langs.yaml');

let _langs = {};
try {
    _langs = yaml.safeLoad(fs.readFileSync(_LANGS_FILE));
} catch (e) {
    if (e.code == 'ENOENT') {
        log.error('Language file %s not found, using default.', _LANGS_FILE);
        if (!fs.existsSync(os.homedir() + '/.config/jd5')) {
            if (!fs.existsSync(os.homedir() + '/.config'))
                fs.mkdirSync(os.homedir() + '/.config');
            fs.mkdirSync(os.homedir() + '/.config/jd5');
        }
        fs.copyFileSync(path.resolve(__dirname, '../examples/langs.yaml'), _LANGS_FILE);
        _langs = yaml.safeLoad(fs.readFileSync(_LANGS_FILE));
    } else {
        log.error('Invalidate Language file %s', _LANGS_FILE);
        log.error(e);
        process.exit(1);
    }
}
async function compile(lang, code, sandbox) {
    if (!_langs[lang]) throw new SystemError('Language not supported');
    let info = _langs[lang], exit_code, run_config;
    let stdout = path.resolve(sandbox.dir, 'stdout');
    let stderr = path.resolve(sandbox.dir, 'stderr');
    if (info.type == 'compiler') {
        await sandbox.writeFile(info.code_file, code);
        ({ code: exit_code } = await sandbox.run(info.compile, {
            stdout, stderr
        }));
        if (exit_code) throw new CompileError({ stdout, stderr });
        await fsp.rename(
            path.resolve(sandbox.dir, 'home', info.cache),
            path.resolve(sandbox.dir, 'cache', 'code_cache')
        );
        run_config = {
            cache: {
                source: path.resolve(sandbox.dir, 'cache', 'code_cache'),
                target: path.resolve(sandbox.dir, 'home', info.cache)
            },
            execute: info.execute
        };
    } else if (info.type == 'interpreter') {
        await fsp.writeFile(path.resolve(sandbox.dir, 'cache', 'code_cache'), code);
        run_config = {
            cache: {
                source: path.resolve(sandbox.dir, 'cache', 'code_cache'),
                target: path.resolve(sandbox.dir, 'home', info.cache)
            },
            execute: info.execute
        };
    }
    return { code: 0, stdout, stderr, run_config };
}

module.exports = compile;
