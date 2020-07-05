const child = require('child_process');
const fs = require('fs');
const { mkdirp } = require('./utils');

function mount(path, size = '32m') {
    if (!fs.existsSync(path)) mkdirp(path);
    child.execSync(`mount tmpfs ${path} -t tmpfs -o size=${size}`);
}

function umount(path) {
    child.execSync(`umount ${path}`);
}

module.exports = { mount, umount };
