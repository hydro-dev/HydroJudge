/*
 * argv[1]：输入
 * argv[2]：选手输出
 * exit code：返回判断结果
 */
const
    fs = require('fs'),
    fsp = fs.promises,
    run = require('../run'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    _compile = require('../compile');

async function check(config) {
    let { status, stdout } = await run('%dir%/checker input usrout', {
        copyIn: {
            usrout: { src: config.user_stdout },
            input: { src: config.input }
        }
    });
    let st = (status == 'Accepted') ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    return { status: st, score: (st == STATUS_ACCEPTED) ? config.score : 0, message: stdout };
}
async function compile(dir, checker, copyIn) {
    let file = await fsp.readFile(checker);
    return _compile(checker.split('.')[1], file, dir, 'checker', copyIn);
}

module.exports = { check, compile };
