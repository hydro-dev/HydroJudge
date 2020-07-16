const yaml = require('js-yaml');
const fs = require('fs-extra');
const { run, del } = require('./sandbox');
const { CompileError, SystemError } = require('./error');
const log = require('./log');
const { STATUS_ACCEPTED } = require('./status');
const { compilerText } = require('./utils');
const { LANGS_FILE, LANGS } = require('./config');

let _langs = {};
try {
    if (LANGS) _langs = LANGS;
    else _langs = yaml.safeLoad(fs.readFileSync(LANGS_FILE).toString());
} catch (e) {
    log.error('Invalidate Language file %s', LANGS_FILE);
    log.error(e);
    if (!global.Hydro) process.exit(1);
}
async function compile(lang, code, target, copyIn, next) {
    if (!_langs[lang]) throw new SystemError(`不支持的语言：${lang}`);
    const info = _langs[lang]; const
        f = {};
    if (info.type === 'compiler') {
        copyIn[info.code_file] = { content: code };
        const {
            status, stdout, stderr, fileIds,
        } = await run(
            info.compile.replace(/\$\{name\}/g, target),
            { copyIn, copyOutCached: [target] },
        );
        if (status !== STATUS_ACCEPTED) throw new CompileError({ status, stdout, stderr });
        if (!fileIds[target]) throw new CompileError({ stderr: '没有找到可执行文件' });
        if (next) next({ compiler_text: compilerText(stdout, stderr) });
        f[target] = { fileId: fileIds[target] };
        return { execute: info.execute, copyIn: f, clean: () => del(fileIds[target]) };
    } if (info.type === 'interpreter') {
        f[target] = { content: code };
        return { execute: info.execute, copyIn: f, clean: () => Promise.resolve() };
    }
}
module.exports = compile;
