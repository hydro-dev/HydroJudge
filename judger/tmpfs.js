const
    child = require('child_process'),
    { mkdirp } = require('./utils'),
    fs = require('fs');
exports.mount = function tmpfs(path, size = '32m') {
    if (!fs.existsSync(path)) mkdirp(path);
    child.execSync(`mount tmpfs ${path} -t tmpfs -o size=${size}`);
};
exports.umount = function tmpfs(path) {
    child.execSync(`umount ${path}`);
};