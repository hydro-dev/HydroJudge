const
    path = require('path'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    fs = require('fs');

async function check(sandbox, config) {
    await Promise.all([
        sandbox.addFile(config.user_stdout, 'usrout'),
        sandbox.addFile(config.output, 'stdout')
    ]);
    let stdout = path.resolve(sandbox.dir, 'home', 'message');
    let { code } = await sandbox.run('/usr/bin/diff -BZ usrout stdout', {
        time_limit_ms: 1000, stdout
    });
    let status, message = '';
    let opt = fs.readFileSync(stdout).toString();
    if (opt) {
        status = STATUS_WRONG_ANSWER;
        opt = opt.split('---');
        let t = opt[0].split('\n');
        let q = opt[1].split('\n');
        message = [t[0], t[1], q[1]].join('\n');
    } else status = STATUS_ACCEPTED;
    return {
        code: 0, score: status == STATUS_ACCEPTED ? config.score : 0,
        status, message
    };
}
async function compile() {
    return { code: 0 };
}

module.exports = { check, compile };
