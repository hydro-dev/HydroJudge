const fs = require('fs');
const path = require('path');
const os = require('os');
if (os.type() == 'Linux' && os.arch() == 'x64') {
    if (__dirname.startsWith('/snapshot')) {
        let e = fs.readFileSync(path.join(__dirname, '..', 'executorserver'));
        fs.writeFileSync(path.resolve(os.tmpdir(), 'executorserver'), e, { mode: 755 });
        process.env.START_EXECUTOR_SERVER = path.resolve(os.tmpdir(), 'executorserver');
    } else process.env.START_EXECUTOR_SERVER = path.join(__dirname, '..', 'executorserver');
    process.env.EXECUTOR_SERVER_ARGS = '--silent';
}
require('./daemon')();