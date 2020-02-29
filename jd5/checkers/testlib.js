const
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    _compile = require('../compile');

async function compile(sandbox, checker) {
    let [file] = await Promise.all([
        fsp.readFile(checker),
        sandbox.addFile(path.resolve(__dirname, '../files/testlib.h'))
    ]);
    return await _compile(checker.split('.')[1], file, sandbox, 'checker');
}
async function check(sandbox, config) {
    await Promise.all([
        sandbox.addFile(config.input, 'in'),
        sandbox.addFile(config.user_stdout, 'user_out'),
        sandbox.addFile(config.output, 'answer')
    ]);
    let stdout = path.resolve(sandbox.dir, 'home', 'stdout');
    let stderr = path.resolve(sandbox.dir, 'home', 'stderr');
    await sandbox.run('/home/checker /home/in /home/user_out /home/answer', { stdout, stderr });
    let message = (await fsp.readFile(stdout)).toString();
    let st = (await fsp.readFile(stderr)).toString();
    return {
        code: 0, status: st == 'ok \n' ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER,
        score: st == 'ok \n' ? config.score : 0, message
    };
}

module.exports = { check, compile };
