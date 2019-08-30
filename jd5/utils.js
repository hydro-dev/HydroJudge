

const
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    EventEmitter = require('events'),
    _mkdirp = require('mkdirp'),
    max = (a, b) => (a > b ? a : b);

function parseTimeMS(str) {
    //TODO(masnn)
}
function parseMemoryMB(str) {
    //TODO(masnn)
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
    parseMemoryMB, parseTimeMS
};
