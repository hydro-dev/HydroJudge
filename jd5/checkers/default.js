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
    await sandbox.run('/usr/bin/diff -BZ usrout stdout', {
        time_limit_ms: 1000, stdout
    });
    let status, message = '';
    let opt = fs.readFileSync(stdout).toString();
    if (opt) {
        status = STATUS_WRONG_ANSWER;
        try {
            let pt = opt.split('---');
            let u = pt[0].split('\n');
            let pos = u[0];
            let usr = u[1].substring(2, u[1].length - 1).trim().split(' ');
            let t = pt[1].split('\n')[1];
            let std = t.substring(2, t.length - 1).trim().split(' ');
            if (usr.length < std.length)
                message = 'User output shorter than standard output.'.translate(config.language || 'zh-CN');
            else if (usr.length > std.length)
                message = 'User output longer than standard output.'.translate(config.language || 'zh-CN');
            else {
                for (let i in usr)
                    if (usr[i] != std[i]) {
                        usr = usr[i];
                        std = std[i];
                        break;
                    }
                if (usr.length > 20) usr = usr.substring(0, 16) + '...';
                if (std.length > 20) std = std.substring(0, 16) + '...';
                message = 'Read {1} at {0} but expect {2}'.translate(config.language || 'zh-CN').format(pos, usr, std);
            }
        } catch (e) {
            message = opt.substring(0, opt.length - 1 <= 30 ? opt.length - 1 : 30);
        }
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
