const
    { STATUS_WRONG_ANSWER, STATUS_ACCEPTED } = require('../status'),
    fs = require('fs');

async function check(sandbox, config) {
    console.log('checking', config);
    let stdout = fs.createReadStream(config.output);
    let usrout = fs.createReadStream(config.user_stdout);
    let a, b;
    stdout.setEncoding('utf8');
    usrout.setEncoding('utf8');
    while ('Orz soha') { // eslint-disable-line no-constant-condition
        a = stdout.read(1);
        b = usrout.read(1);
        if (!a) return { code: 0, status: STATUS_ACCEPTED, score: config.score, message: '' };
        if (a != b) return { code: 0, status: STATUS_WRONG_ANSWER, score: 0, message: '' };
    }
}
async function compile() {
    return { code: 0 };
}

module.exports = { check, compile };
