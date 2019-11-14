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
    path = require('path'),
    { SystemError } = require('../error'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    { parseLang } = require('../utils'),
    _compile = require('../compile');

async function check(sandbox, config) {
    await Promise.all([
        sandbox.addFile(config.input, 'in'),
        sandbox.addFile(config.user_stdout, 'user_out'),
        sandbox.addFile(config.output, 'answer'),
        sandbox.writeFile('code', config.code)
    ]);
    let stdout = path.resolve(sandbox.dir, 'home', 'stdout');
    let stderr = path.resolve(sandbox.dir, 'home', 'stderr');
    let { code } = await sandbox.run('/home/checker', { stdout, stderr });
    if (code) throw new SystemError('Checker returned a non-zero value', [code]);
    let score = parseInt((await fsp.readFile(stdout)).toString());
    let message = (await fsp.readFile(stderr)).toString();
    let status = score == config.score ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    return { code, status, score, message };
}

module.exports = { check, compile: (sandbox, checker) => _compile(parseLang(checker), checker, sandbox, 'checker') };