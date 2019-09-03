const
    checkers = require('./checkers'),
    { SystemError } = require('./error');

async function check(sandbox, config) {
    if (!checkers[config.checker_type])
        throw new SystemError('Unknown checker type:', [config.checker_type]);
    let { code, status, score, message } = await checkers[config.checker_type].check(sandbox, {
        input: config.input, output: config.output,
        user_stdout: config.user_stdout, user_stderr: config.user_stderr,
        score
    });
    if (code) throw new SystemError('Checker returned a none-zero value', [code]);
    return [status, score, message];
}

module.exports = check;
