const
    run = require('../run'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status');

async function check(config) {
    let { stdout } = await run('/usr/bin/diff -BZ usrout stdout', {
        copyIn: {
            usrout: { src: config.user_stdout },
            stdout: { src: config.output }
        }
    });
    let status, message = '';
    if (stdout) {
        status = STATUS_WRONG_ANSWER;
        if (config.detail)
            try {
                let pt = stdout.split('---');
                let u = pt[0].split('\n');
                let pos = u[0];
                let usr = u[1].substring(2, u[1].length - 1).trim().split(' ');
                let t = pt[1].split('\n')[1];
                let std = t.substring(2, t.length - 1).trim().split(' ');
                if (usr.length < std.length)
                    message = 'User output shorter than standard output.';
                else if (usr.length > std.length)
                    message = 'User output longer than standard output.';
                else {
                    for (let i in usr)
                        if (usr[i] != std[i]) {
                            usr = usr[i];
                            std = std[i];
                            break;
                        }
                    if (usr.length > 20) usr = usr.substring(0, 16) + '...';
                    if (std.length > 20) std = std.substring(0, 16) + '...';
                    message = `Read ${usr} at ${pos} but expect ${std}`;
                }
            } catch (e) {
                message = stdout.substring(0, stdout.length - 1 <= 30 ? stdout.length - 1 : 30);
            }
    } else status = STATUS_ACCEPTED;
    return {
        score: status == STATUS_ACCEPTED ? config.score : 0,
        status, message
    };
}
async function compile() {
    return {};
}

module.exports = { check, compile };
