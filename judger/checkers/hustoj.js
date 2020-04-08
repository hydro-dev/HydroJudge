/*
 * argv[1]：输入
 * argv[2]：标准输出
 * argv[3]：选手输出
 * exit code：返回判断结果
 */
const
    fs = require('fs'),
    fsp = fs.promises,
    { run } = require('../sandbox'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    _compile = require('../compile');

async function check(config) {
    let { code, stdout } = await run('${dir}/checker input stdout usrout', {
        copyIn: {
            usrout: { src: config.user_stdout },
            stdout: { src: config.output },
            input: { src: config.input }
        }
    });
    let status = (code == 0) ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER;
    let message = (await fsp.readFile(stdout)).toString();
    return { status, score: (status == STATUS_ACCEPTED) ? config.score : 0, message };
}
async function compile(checker, copyIn) {
    let file = await fsp.readFile(checker);
    return _compile(checker.split('.')[1], file, 'checker', copyIn);
}

module.exports = { check, compile };
