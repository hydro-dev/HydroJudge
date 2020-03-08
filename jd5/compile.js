const
    yaml = require('js-yaml'),
    fs = require('fs'),
    path = require('path'),
    fsp = fs.promises,
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
async function compile(lang, code, dir, target, copyIn, next) {
    if (!_langs[lang]) throw new SystemError('Language not supported');
    let info = _langs[lang];
    if (info.type == 'compiler') {
        copyIn[info.code_file] = { content: code };
        let { status, stdout, stderr } = await run(
            info.compile.replace(/\$\{name\}/g, target),
            { copyIn, copyOutDir: dir }
        );
        if (next) next({ compiler_text: compilerText(stdout, stderr) });
        if (status != 'Accepted') throw new CompileError({ status, stdout, stderr });
    } else if (info.type == 'interpreter')
        await fsp.writeFile(path.resolve(dir, target), code);
    return info.execute;
}

module.exports = compile;
