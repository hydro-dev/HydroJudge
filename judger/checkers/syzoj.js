/*
 * in：输入
 * user_out：选手输出
 * answer：标准输出
 * code：选手代码
 * stdout：输出最终得分
 * stderr：输出错误报告
 */
const fs = require('fs');
const { run } = require('../sandbox');
const { SystemError } = require('../error');
const { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status');
const _compile = require('../compile');

const fsp = fs.promises;

async function check(config) {
    // eslint-disable-next-line prefer-const
    let { status, stdout, stderr } = await run('${dir}/checker', {
        copyIn: {
            in: { src: config.input },
            user_out: { src: config.user_stdout },
            answer: { src: config.output },
            code: { content: config.code },
        },
    });
    if (status !== 'Accepted') throw new SystemError('Checker returned a non-zero value', [status]);
    const score = parseInt(stdout);
    status = score === config.score ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    return { status, score, message: stderr };
}

async function compile(checker, copyIn) {
    const file = await fsp.readFile(checker);
    return _compile(checker.split('.')[1], file, 'checker', copyIn);
}

module.exports = { check, compile };
