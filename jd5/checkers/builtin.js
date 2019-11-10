const
    path = require('path'),
    _compile = require('../compile'),
    { SystemError } = require('../error'),
    fs = require('fs');

async function check(sandbox, config) {
    await Promise.all([
        sandbox.addFile(config.user_stdout, 'usrout'),
        sandbox.addFile(config.output, 'stdout')
    ]);
    await fs.promises.copyFile(path.resolve(sandbox.dir, 'cache', 'checker'), path.resolve(sandbox.dir, 'home', 'checker'));
    let { code } = await sandbox.run('/home/checker', {});
    let message = fs.readFileSync(path.resolve(sandbox.dir, 'home', 'message')).toString();
    return {
        code: 0, score: code == 1 ? config.score : 0,
        status: code, message
    };
}
async function compile(sandbox) {
    let checker_code = await fs.promises.readFile(path.resolve(__dirname, 'checker.cpp'));
    let { code, stdout, stderr } = await _compile('cc', checker_code, sandbox, 'checker');
    if (code) throw new SystemError('Cannot compile checker');
    return { code, stdout, stderr };
}

module.exports = { check, compile };
