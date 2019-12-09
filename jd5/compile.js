const
    path = require('path'),
    yaml = require('js-yaml'),
    fs = require('fs'),
    os = require('os'),
    { CompileError, SystemError } = require('./error'),
    log = require('./log'),
    { LANGS_FILE } = require('./config');

let _langs = {};
try {
    _langs = yaml.safeLoad(fs.readFileSync(LANGS_FILE));
} catch (e) {
    log.error('Invalidate Language file %s', LANGS_FILE);
    log.error(e);
    process.exit(1);
}
async function compile(lang, code, sandbox, target) {
    if (!_langs[lang]) throw new SystemError('Language not supported');
    let info = _langs[lang], exit_code;
    let stdout = path.resolve(sandbox.dir, 'stdout');
    let stderr = path.resolve(sandbox.dir, 'stderr');
    if (info.type == 'compiler') {
        await sandbox.writeFile(info.code_file, code);
        ({ code: exit_code } = await sandbox.run(info.compile.replace('%filename%', target), {
            stdout, stderr
        }));
        if (exit_code) throw new CompileError({ stdout, stderr });
    } else if (info.type == 'interpreter') {
        await sandbox.writeFile(target, code);
    }
    return { code: 0, stdout, stderr, execute: info.execute };
}

module.exports = compile;
