const
    checkers = require('./checkers'),
    { SystemError } = require('./error');

async function check(sandbox, config) {
    if (!checkers[config.checker_type])
        throw new SystemError('Unknown checker type:', [config.checker_type]);
    let { code, status, score, message } = await checkers[config.checker_type].check(sandbox, {
        input: config.stdin, output: config.stdout,
        user_stdout: config.user_stdout, user_stderr: config.user_stderr,
        score: config.score
    });
    if (code) throw new SystemError('Checker returned a none-zero value', [code]);
    return [status, score, message];
}
async function compile_checker(sandbox, checker_type, checker) {
    if (!checkers[checker_type])
        throw new SystemError('Unknown checker type:', [checker_type]);
    let { code, status, message } = await checkers[checker_type].compile(sandbox, checker);
    if (code) throw new SystemError('Checker compile failed', [code]);
    return [status, message];
}

module.exports = { check, compile_checker };
