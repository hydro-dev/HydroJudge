const
    syzoj = require('./syzoj'),
    path = require('path');

async function compile(sandbox, checker) {
    await sandbox.addFile(path.resolve(__dirname, '../files/testlib.h'));
    return await syzoj.compile(sandbox, checker);
}

module.exports = { check: syzoj.check, compile };
