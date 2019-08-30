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
async function check(lang, code, input, output, ans, sandbox) {
    if (!_langs[lang]) throw new Error('Language not supported');
    let info = _langs[lang], result;
    let run_config = {};
    if (info.type == 'compiler') {
        await fsp.writeFile(
            path.resolve(sandbox.dir, 'config.json'),
            JSON.stringify({ execute: info.compile.split(' ') })
        );
        await fsp.writeFile(path.resolve(sandbox.dir, 'home', info.code_file), code);
        result = await sandbox.run(config);
        if (!result || result.code)
            throw new CompileError(
                fs.readFileSync(path.resolve(sandbox.dir, 'stdout')).toString(),
                fs.readFileSync(path.resolve(sandbox.dir, 'stderr')).toString()
            );
        await fsp.rename(
            path.resolve(sandbox.dir, 'home', info.cache),
            path.resolve(sandbox.dir, 'cache', info.cache)
        );
        run_config = { cache: info.cache, execute: info.execute.split(' ') };
    } else if (info.type == 'interpreter') {
        await fsp.writeFile(path.resolve(sandbox.dir, 'cache', info.code_file), code);
        run_config = { cache: info.code_file, execute: info.execute.split(' ') };
    }
    return [0, [
        fs.readFileSync(path.resolve(sandbox.dir, 'stdout')).toString(),
        fs.readFileSync(path.resolve(sandbox.dir, 'stderr')).toString()
    ].join('\n'), run_config];
}

module.exports = compile;
