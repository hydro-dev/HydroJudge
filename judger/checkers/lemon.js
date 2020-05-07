/*
argv[1]：输入文件
argv[2]：选手输出文件
argv[3]：标准输出文件
argv[4]：单个测试点分值
argv[5]：输出最终得分的文件
argv[6]：输出错误报告的文件
*/

const fsp = require('fs').promises;
const { run } = require('../sandbox');
const { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status');
const _compile = require('../compile');

async function check(config) {
    const { files } = await run(`\${dir}/checker input usrout stdout ${config.score} score message`, {
        copyIn: {
            usrout: { src: config.user_stdout },
            stdout: { src: config.output },
            input: { src: config.input },
        },
        copyOut: ['score', 'message'],
    });
    const { message } = files;
    const score = parseInt(files.score);
    return {
        score,
        message,
        status: score === config.score ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER,
    };
}

async function compile(checker, copyIn) {
    const file = await fsp.readFile(checker);
    return _compile(checker.split('.')[1], file, 'checker', copyIn);
}

module.exports = { check, compile };
