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
    run = require('../run'),
    { SystemError } = require('../error'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    _compile = require('../compile');

async function check(config) {
    let { status, stdout, stderr } = await run('${dir}/checker', {
        copyIn: {
            in: { src: config.input },
            user_out: { src: config.user_stdout },
            answer: { src: config.output },
            code: { content: config.code }
        }
    });
    if (status != 'Accepted') throw new SystemError('Checker returned a non-zero value', [status]);
    let score = parseInt(stdout);
    status = score == config.score ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    return { status, score, message: stderr };
}
async function compile(checker, copyIn) {
    let file = await fsp.readFile(checker);
    return _compile(checker.split('.')[1], file, 'checker', copyIn);
}

module.exports = { check, compile };