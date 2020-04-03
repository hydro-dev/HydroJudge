const fs = require('fs');
const path = require('path');
const os = require('os');
if (os.arch() == 'linux') {
    let e = fs.readFileSync(path.join(__dirname, '..', 'executorserver'));
    fs.writeFileSync(path.resolve(os.tmpdir(), 'executorserver'), e, { mode: 755 });
    process.env.START_EXECUTOR_SERVER = path.resolve(os.tmpdir(), 'executorserver');
    process.env.EXECUTOR_SERVER_ARGS = '--silent';
}
require('./daemon');