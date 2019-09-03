const
    fs = require('fs'),
    fsp = fs.promises,
    { SystemError } = require('../error'),
    { parseLang } = require('../utils'),
    _compile = require('../compile');

async function check(sandbox, config) {
    await sandbox.createfd(config.input, 3);
    let { code, stdout, stderr } = await sandbox.run({
        input: config.user_output
    });
    stdout = await fsp.readFile(stdout);
    let message = await fsp.readFile(stderr);
    let [status, score] = stdout.split(' ');
    return { code, status, score, message };
}
async function compile(sandbox, config) {
    let checker_code = await fsp.readFile(config.checker);
    let { code, stdout, stderr } = await _compile(parseLang(config.checker), checker_code, sandbox);
    if (code) throw new SystemError('Cannot compile checker');
    return { code, stdout, stderr };
}

module.exports = { check, compile };
