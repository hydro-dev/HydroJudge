

const
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    EventEmitter = require('events'),
    _mkdirp = require('mkdirp'),
    { FormatError } = require('./error'),
    max = (a, b) => (a > b ? a : b),
    TIME_RE = /^([0-9]+(?:\.[0-9]*)?)([mu]?)s?$/i,
    TIME_UNITS = { '': 1000, 'm': 1, 'u': 0.001 },
    MEMORY_RE = /^([0-9]+(?:\.[0-9]*)?)([kmg])b?$/i,
    MEMORY_UNITS = { 'k': 0.1, 'm': 1, 'g': 1024 };

function parseTimeMS(str) {
    let match = TIME_RE.exec(str);
    if (!match) throw new FormatError(str, 'error parsing time');
    return parseInt(parseFloat(match[1]) * TIME_UNITS[match[2]]);
}
function parseMemoryMB(str) {
    let match = MEMORY_RE.exec(str);
    if (!match) throw new FormatError(str, 'error parsing memory');
    return parseInt(parseFloat(match[1]) * MEMORY_UNITS[match[2]]);
}
function sleep(timeout) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}
function rmdir(path, { recursive = false }) {
    if (recursive) {
        if (fs.existsSync(path))
            fs.readdirSync(path).forEach(file => {
                let curPath = path + '/' + file;
                if (fs.statSync(curPath).isDirectory()) rmdir(curPath);
                else fs.unlinkSync(curPath);
            });
        fs.rmdirSync(path);
    } else fs.rmdirSync(path);
}
function mkdirp(p) {
    return new Promise((resolve, reject) => {
        _mkdirp(path.resolve(p), err => {
            if (err) reject(err);
            resolve();
        });
    });
}
async function download(axios, url, filepath) {
    let res = await axios.get(url, { responseType: 'stream' });
    let file = fs.createWriteStream(filepath);
    await new Promise((resolve, reject) => {
        mkdirp(path.dirname(filepath), err => {
            if (err) reject(err);
            else resolve();
        });
    });
    await new Promise((resolve, reject) => {
        res.data.pipe(file);
        res.data.on('end', () => { resolve(); });
        file.on('error', err => { reject(err); });
    });
}
function parseLang(filename) {
    let t = filename.split('.');
    let ext = t[t.length - 1];
    switch (t) {
        case 'cpp': return 'cc';
        case 'py2': return 'py';
        case 'pas', 'cc', 'c', 'java', 'py', 'py3', 'php', 'rs', 'js', 'hs', 'go', 'rb', 'cs': return ext;
    }
    throw new FormatError('Unknown checker language', [ext]);
}
class Queue extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
    }
    async get() {
        if (this.empty())
            await new Promise(resolve => {
                this.once('new', () => { resolve(); });
            });
        let top = this.queue[0];
        this.queue = _.drop(this.queue, 1);
        return top;
    }
    empty() {
        return this.queue.length == 0;
    }
    push(value) {
        this.queue.push(value);
        this.emit('new');
    }
}

module.exports = {
    download, Queue, mkdirp, max, rmdir, sleep,
    parseMemoryMB, parseTimeMS, parseLang
};
