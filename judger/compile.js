const
    yaml = require('js-yaml'),
    fs = require('fs'),
    run = require('./run'),
    { CompileError, SystemError } = require('./error'),
    log = require('./log'),
    { compilerText } = require('./utils'),
    { LANGS_FILE } = require('./config');

let _langs = {};
try {
    _langs = yaml.safeLoad(fs.readFileSync(LANGS_FILE));
} catch (e) {
    log.error('Invalidate Language file %s', LANGS_FILE);
    log.error(e);
    process.exit(1);
}
async function compile(lang, code, target, copyIn, next) {
    if (!_langs[lang]) throw new SystemError('Language not supported');
    let info = _langs[lang], f = {};
    if (info.type == 'compiler') {
        copyIn[info.code_file] = { content: code };
        let { status, stdout, stderr, fileIds } = await run(
            info.compile.replace(/\$\{name\}/g, target),
            { copyIn, copyOutCached: [target] }
        );
        if (status != 'Accepted') throw new CompileError({ status, stdout, stderr });
        if (!fileIds[target]) throw new CompileError({ stderr: 'No executable file' });
        if (next) next({ compiler_text: compilerText(stdout, stderr) });
        f[target] = { fileId: fileIds[target] };
        return { execute: info.execute, copyIn: f };
    } else if (info.type == 'interpreter') {
        f[target] = { content: code };
        return { execute: info.execute, copyIn: f };
    }
}
module.exports = compile;
