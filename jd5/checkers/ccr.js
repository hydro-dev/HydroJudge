/*
 * stdin：输入
 * argv[3]：选手输出
 * argv[2]：标准输出
 * stdout:L1：输出最终得分比率
 * stdout:L2：输出错误报告
 */
const
    fs = require('fs'),
    path = require('path'),
    fsp = fs.promises,
    { SystemError } = require('../error'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    _compile = require('../compile');

async function check(sandbox, config) {
    await Promise.all([
        sandbox.addFile(config.user_stdout, 'usrout'),
        sandbox.addFile(config.output, 'stdout')
    ]);
    let stdout = path.resolve(sandbox.dir, 'home', 'cmp');
    let { code } = await sandbox.run('/home/checker stdout usrout', {});
    let status;
    if (code) throw new SystemError('Checker returned a non-zero value', [code]);
    stdout = (await fsp.readFile(stdout)).toString();
    stdout = stdout.split('\n');
    let score = parseInt(stdout[0]);
    let message = stdout[1];
    if (score == 1) status = STATUS_ACCEPTED;
    else status = STATUS_WRONG_ANSWER;
    return { code, status, score: Math.floor(config.score * score), message };
}
async function compile(sandbox, checker) {
    let file = await fsp.readFile(checker);
    return _compile(checker.split('.')[1], file, sandbox, 'checker');
}

module.exports = { check, compile };
