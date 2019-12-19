/*
 * FILENAME.in：输入
 * FILENAME.out：选手输出
 * argv[2]：标准输出
 * argv[1]：单个测试点分值
 * score.log：输出最终得分
 * report.log：输出错误报告
 */
const
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    { SystemError } = require('../error'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    { parseLang } = require('../utils'),
    _compile = require('../compile');

async function check(sandbox, config) {
    let stdans = await sandbox.addFile(config.output);
    let { code } = await sandbox.run({
        params: [config.score, stdans]
    });
    let status;
    if (code) throw new SystemError('Checker returned a non-zero value', [code]);
    let score = (await fsp.readFile(path.resolve(sandbox.homedir, 'score.log'))).toString();
    let message = (await fsp.readFile(path.resolve(sandbox.homedir, 'report.log'))).toString();
    if (score == config.score) status = STATUS_ACCEPTED;
    else status = STATUS_WRONG_ANSWER;
    return { code, status, score, message };
}
async function compile(sandbox, checker) {
    let file = await fsp.readFile(checker);
    return _compile(parseLang(checker), file, sandbox, 'checker');
}

module.exports = { check, compile };
