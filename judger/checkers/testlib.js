const
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    run = require('../run'),
    { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status'),
    _compile = require('../compile');

async function check(config) {
    let { stdout, stderr } = await run('${dir}/checker ${dir}/in ${dir}/user_out ${dir}/answer', {
        copyIn: {
            in: { src: config.input },
            user_out: { src: config.user_stdout },
            answer: { src: config.output }
        }
    });
    return {
        status: stderr == 'ok \n' ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER,
        score: stderr == 'ok \n' ? config.score : 0, message: stdout
    };
}
async function compile_checker(checker, copyIn) {
    copyIn['testlib.h'] = { src: path.resolve(__dirname, '../files/testlib.h') };
    let file = await fsp.readFile(checker);
    return await _compile(checker.split('.')[1], file, 'checker', copyIn);
}
async function compile_interactor(interactor, copyIn) {
    copyIn['testlib.h'] = { src: path.resolve(__dirname, '../files/testlib.h') };
    let file = await fsp.readFile(interactor);
    return await _compile(interactor.split('.')[1], file, 'interactor', copyIn);
}

module.exports = {
    check, compile: compile_checker,
    compile_checker, compile_interactor
};
