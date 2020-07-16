const fs = require('fs-extra');
const path = require('path');
const { run } = require('../sandbox');
const { FILES_DIR } = require('../config');
const { STATUS_ACCEPTED, STATUS_WRONG_ANSWER } = require('../status');
const _compile = require('../compile');

const fsp = fs.promises;

async function check(config) {
    const { stdout, stderr } = await run('${dir}/checker ${dir}/in ${dir}/user_out ${dir}/answer', {
        copyIn: {
            in: { src: config.input },
            user_out: { src: config.user_stdout },
            answer: { src: config.output },
        },
    });
    return {
        status: stderr === 'ok \n' ? STATUS_ACCEPTED : STATUS_WRONG_ANSWER,
        score: stderr === 'ok \n' ? config.score : 0,
        message: stdout,
    };
}

async function compileChecker(checker, copyIn) {
    copyIn['testlib.h'] = { src: path.resolve(FILES_DIR, 'testlib.h') };
    const file = await fsp.readFile(checker);
    return await _compile(checker.split('.')[1], file, 'checker', copyIn);
}

async function compileInteractor(interactor, copyIn) {
    copyIn['testlib.h'] = { src: path.resolve(FILES_DIR, 'testlib.h') };
    const file = await fsp.readFile(interactor);
    return await _compile(interactor.split('.')[1], file, 'interactor', copyIn);
}

module.exports = {
    check,
    compile: compileChecker,
    compileChecker,
    compileInteractor,
};
