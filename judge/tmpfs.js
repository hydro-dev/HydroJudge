const child = require('child_process');
const fs = require('fs');

function mount(path, size = '32m') {
    fs.ensureDirSync(path);
    child.execSync(`mount tmpfs ${path} -t tmpfs -o size=${size}`);
}

function umount(path) {
    child.execSync(`umount ${path}`);
}

module.exports = { mount, umount };
