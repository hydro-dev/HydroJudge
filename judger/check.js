const checkers = require('./checkers');
const { SystemError } = require('./error');

async function check(config) {
    if (!checkers[config.checker_type]) { throw new SystemError(`未知比较器类型：${config.checker_type}`); }
    const {
        code, status, score, message,
    } = await checkers[config.checker_type].check({
        input: config.stdin,
        output: config.stdout,
        user_stdout: config.user_stdout,
        user_stderr: config.user_stderr,
        score: config.score,
        copyIn: config.copyIn || {},
        detail: config.detail,
    });
    if (code) throw new SystemError(`比较器返回了非零值：${code}`);
    return [status, score, message];
}
async function compileChecker(checkerType, checker, copyIn) {
    if (!checkers[checkerType]) { throw new SystemError(`未知比较器类型：${checkerType}`); }
    const { code, status, message } = await checkers[checkerType].compile(checker, copyIn);
    if (code) throw new SystemError(`比较器编译失败：${code}`);
    return [status, message];
}

module.exports = { check, compileChecker };
