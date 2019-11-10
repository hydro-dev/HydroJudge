const
    path = require('path'),
    { STATUS_WRONG_ANSWER, STATUS_ACCEPTED } = require('../status'),
    fs = require('fs');

async function check(sandbox, config) {
    let usrout = await sandbox.addFile(config.user_stdout);
    let stdans = await sandbox.addFile(config.output);
    let { code } = await sandbox.run(
        `/usr/bin/diff -ZB ${usrout} ${stdans}`, {}
    );
    let stdout = path.resolve(sandbox.dir, 'stdout');
    let stderr = path.resolve(sandbox.dir, 'stderr');
    stdout = (await fs.promises.readFile(stdout)).toString();
    stderr = (await fs.promises.readFile(stderr)).toString();
    stdout = stdout.split('\n');
    if (stdout) return {
        code: 0, status: STATUS_WRONG_ANSWER,
        message: stdout, score: 0
    };
    else return {
        code: 0, score: config.score,
        status: STATUS_ACCEPTED, message: ''
    };
}
async function compile() {
    return { code: 0 };
}

module.exports = { check, compile };
