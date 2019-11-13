/*
argv[1]：输入文件
argv[2]：选手输出文件
argv[3]：标准输出文件
argv[4]：单个测试点分值
argv[5]：输出最终得分的文件
argv[6]：输出错误报告的文件
*/

const
    fsp = require('fs').promises,
    path = require('path'),
    { SystemError } = require('../error'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    { parseLang } = require('../utils'),
    _compile = require('../compile');

async function check(sandbox, config) {
    await Promise.all([
        sandbox.addFile(config.user_stdout, 'usrout'),
        sandbox.addFile(config.output, 'stdout'),
        sandbox.addFile(config.input, 'input')
    ]);
    console.log(config);
    let { code } = await sandbox.run(
        `/home/checker input usrout stdout ${config.score} score message`, {}
    );
    let message = (await fsp.readFile(path.resolve(sandbox.dir, 'home', 'message'))).toString();
    let score = (await fsp.readFile(path.resolve(sandbox.dir, 'home', 'score'))).toString();
    return {
        code, score, message,
        status: score == config.score ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER
    };
}
async function compile(sandbox, checker) {
    let checker_code = await fsp.readFile(checker);
    let { code, stdout, stderr } = await _compile(parseLang(checker), checker_code, sandbox, 'checker');
    if (code) throw new SystemError('Cannot compile checker');
    return { code, stdout, stderr };
}

module.exports = { check, compile };
