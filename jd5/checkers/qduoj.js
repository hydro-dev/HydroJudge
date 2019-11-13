/*
 * argv[1]：输入
 * argv[2]：选手输出
 * exit code：返回判断结果
 */
const
    fs = require('fs'),
    fsp = fs.promises,
    { SystemError } = require('../error'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    { parseLang } = require('../utils'),
    _compile = require('../compile');

async function check(sandbox, config) {
    await Promise.all([
        sandbox.addFile(config.user_stdout, 'usrout'),
        sandbox.addFile(config.input, 'input')
    ]);
    let { code, stdout } = await sandbox.run(
        '/home/checker input usrout', {}
    );
    if (code == -1) throw new SystemError('Checker returned -1');
    let status = (code == 0) ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    let message = (await fsp.readFile(stdout)).toString();
    return { code, status, score: (status == STATUS_ACCEPTED) ? config.score : 0, message };
}
async function compile(sandbox, checker) {
    let checker_code = await fsp.readFile(checker);
    let { code, stdout, stderr } = await _compile(parseLang(checker), checker_code, sandbox, 'checker');
    if (code) throw new SystemError('Cannot compile checker');
    return { code, stdout, stderr };
}

module.exports = { check, compile };
