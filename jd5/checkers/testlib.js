const
    syzoj = require('./syzoj'),
    path = require('path');

async function compile(sandbox, config) {
    await sandbox.addFile(path.resolve(__dirname, '../files/testlib.h'));
    return await syzoj.compile(sandbox, config);
}

module.exports = { check: syzoj.check, compile };
