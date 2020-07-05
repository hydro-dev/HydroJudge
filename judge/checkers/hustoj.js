/*
 * argv[1]：输入
 * argv[2]：标准输出
 * argv[3]：选手输出
 * exit code：返回判断结果
 */
const fs = require('fs');
const { run } = require('../sandbox');
const { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status');
const _compile = require('../compile');

const fsp = fs.promises;

async function check(config) {
    const { code, stdout } = await run('${dir}/checker input stdout usrout', {
        copyIn: {
            usrout: { src: config.user_stdout },
            stdout: { src: config.output },
            input: { src: config.input },
        },
    });
    const status = code ? STATUS_WRONG_ANSWER : STATUS_ACCEPTED;
    const message = (await fsp.readFile(stdout)).toString();
    return { status, score: (status === STATUS_ACCEPTED) ? config.score : 0, message };
}

async function compile(checker, copyIn) {
    const file = await fsp.readFile(checker);
    return _compile(checker.split('.')[1], file, 'checker', copyIn);
}

module.exports = { check, compile };
