const
    path = require('path'),
    fs = require('fs'),
    fsp = fs.promises,
    { CompileError, SystemError } = require('./error'),
    log = require('./log'),
    { CONFIG_DIR } = require('./config'),
    _LANGS_FILE = path.join(CONFIG_DIR, 'langs.json');

let _langs = {};
try {
    _langs = JSON.parse(fs.readFileSync(_LANGS_FILE));
} catch (e) {
    log.error('Language file %s not found or invalidate.', _LANGS_FILE);
    log.error(e);
    process.exit(1);
}
async function compile(lang, code, sandbox) {
    if (!_langs[lang]) throw new SystemError('Language not supported');
    let info = _langs[lang], exit_code, run_config;
    let stdout = path.resolve(sandbox.dir, 'stdout');
    let stderr = path.resolve(sandbox.dir, 'stderr');
    if (info.type == 'compiler') {
        await fsp.writeFile(path.resolve(sandbox.dir, 'home', info.code_file), code);
        ({ code: exit_code } = await sandbox.run(info.compile[0], info.compile[1], {
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
