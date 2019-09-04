/*
 * in：输入
 * user_out：选手输出
 * answer：标准输出
 * code：选手代码
 * stdout：输出最终得分
 * stderr：输出错误报告
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
        sandbox.addFile(config.input, 'in'), sandbox.addFile(config.user_output, 'user_out'),
        sandbox.addFile(config.output, 'answer'), sandbox.writeFile(config.code, 'code')
    ]);
    let { code, stdout, stderr } = await sandbox.run();
    if (code) throw new SystemError('Checker returned a non-zero value', [code]);
    let score = parseInt((await fsp.readFile(stdout)).toString());
    let message = (await fsp.readFile(stderr)).toString();
    let status = score == config.score ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    return { code, status, score, message };
}
async function compile(sandbox, config) {
    let checker_code = await fsp.readFile(config.checker);
    let { code, stdout, stderr } = await _compile(parseLang(config.checker), checker_code, sandbox);
    if (code) throw new SystemError('Cannot compile checker');
    return { code, stdout, stderr };
}

module.exports = { check, compile };
