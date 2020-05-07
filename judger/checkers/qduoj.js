/*
 * argv[1]：输入
 * argv[2]：选手输出
 * exit code：返回判断结果
 */
const fs = require('fs');
const { run } = require('../sandbox');
const { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status');
const _compile = require('../compile');

const fsp = fs.promises;

async function check(config) {
    const { status, stdout } = await run('${dir}/checker input usrout', {
        copyIn: {
            usrout: { src: config.user_stdout },
            input: { src: config.input },
        },
    });
    const st = (status === 'Accepted') ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    return { status: st, score: (st === STATUS_ACCEPTED) ? config.score : 0, message: stdout };
}

async function compile(checker, copyIn) {
    const file = await fsp.readFile(checker);
    return _compile(checker.split('.')[1], file, 'checker', copyIn);
}

module.exports = { check, compile };
