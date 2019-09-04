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
    let [input, user_output] = await Promise.all([
        sandbox.addFile(config.input), sandbox.addFile(config.user_output)
    ]);
    let { code, stdout } = await sandbox.run({
        params: [input, user_output]
    });
    if (code == -1) throw new SystemError('Checker returned -1');
    let status = (code == 0) ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    let message = (await fsp.readFile(stdout)).toString();
    return { code, status, score: (status == STATUS_ACCEPTED) ? config.score : 0, message };
}
async function compile(sandbox, config) {
    let checker_code = await fsp.readFile(config.checker);
    let { code, stdout, stderr } = await _compile(parseLang(config.checker), checker_code, sandbox);
    if (code) throw new SystemError('Cannot compile checker');
    return { code, stdout, stderr };
}

module.exports = { check, compile };
