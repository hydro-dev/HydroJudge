const yaml = require('js-yaml');
const fs = require('fs');
const { run, del } = require('./sandbox');
const { CompileError, SystemError } = require('./error');
const log = require('./log');
const { compilerText } = require('./utils');
const { LANGS_FILE } = require('./config');

let _langs = {};
try {
    _langs = yaml.safeLoad(fs.readFileSync(LANGS_FILE));
} catch (e) {
    log.error('Invalidate Language file %s', LANGS_FILE);
    log.error(e);
    process.exit(1);
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
        if (status !== 'Accepted') throw new CompileError({ status, stdout, stderr });
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
