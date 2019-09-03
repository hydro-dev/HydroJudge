const
    os = require('os'),
    path = require('path'),
    yaml = require('js-yaml'),
    fs = require('fs'),
    { CompileError } = require('./error'),
    fsp = fs.promises,
    _CONFIG_DIR = path.resolve(os.homedir(), '.config', 'jd5'),
    _LANGS_FILE = path.join(_CONFIG_DIR, 'langs.yaml');

let _langs = {};
try {
    _langs = yaml.safeLoad((fs.readFileSync(_LANGS_FILE)).toString());
} catch (e) {
    console.error('Language file %s not found or invalidate.', _LANGS_FILE);
    process.exit(1);
}
async function compile(lang, code, sandbox) {
    if (!_langs[lang]) throw new Error('Language not supported');
    let info = _langs[lang], stdout, exit_code, stderr;
    let run_config;
    if (info.type == 'compiler') {
        await fsp.writeFile(path.resolve(sandbox.dir, 'home', info.code_file), code);
        ({ exit_code, stdout, stderr } = await sandbox.run({ execute: info.compile.split(' ') }));
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
            execute: info.execute.split(' ')
        };
    } else if (info.type == 'interpreter') {
        await fsp.writeFile(path.resolve(sandbox.dir, 'cache', 'code_cache'), code);
        run_config = {
            cache: {
                source: path.resolve(sandbox.dir, 'cache', 'code_cache'),
                target: path.resolve(sandbox.dir, 'home', info.cache)
            },
            execute: info.execute.split(' ')
        };
    }
    return { code: 0, stdout, stderr, run_config };
}

module.exports = compile;
