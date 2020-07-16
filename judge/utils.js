const fs = require('fs');
const path = require('path');
const { parse } = require('shell-quote');
const _ = require('lodash');
const EventEmitter = require('events');
const { FormatError } = require('./error');

const max = (a, b) => (a > b ? a : b);
const TIME_RE = /^([0-9]+(?:\.[0-9]*)?)([mu]?)s?$/i;
const TIME_UNITS = { '': 1000, m: 1, u: 0.001 };
const MEMORY_RE = /^([0-9]+(?:\.[0-9]*)?)([kmg])b?$/i;
const MEMORY_UNITS = { k: 0.1, m: 1, g: 1024 };
const EMPTY_STR = /^[ \r\n\t]*$/i;

function parseTimeMS(str) {
    const match = TIME_RE.exec(str);
    if (!match) throw new FormatError(str, 'error parsing time');
    return parseInt(parseFloat(match[1]) * TIME_UNITS[match[2]]);
}

function parseMemoryMB(str) {
    const match = MEMORY_RE.exec(str);
    if (!match) throw new FormatError(str, 'error parsing memory');
    return parseInt(parseFloat(match[1]) * MEMORY_UNITS[match[2]]);
}

function sleep(timeout) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}

function parseFilename(path) {
    const t = path.split('/');
    return t[t.length - 1];
}

class Queue extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.waiting = [];
    }

    get(count = 1) {
        if (this.empty() || this.queue.length < count) {
            return new Promise((resolve) => {
                this.waiting.push({ count, resolve });
            });
        }
        const items = [];
        for (let i = 0; i < count; i++) { items.push(this.queue[i]); }
        this.queue = _.drop(this.queue, count);
        return items;
    }

    empty() {
        return this.queue.length === 0;
    }

    push(value) {
        this.queue.push(value);
        if (this.waiting.length && this.waiting[0].count <= this.queue.length) {
            const items = [];
            for (let i = 0; i < this.waiting[0].count; i++) { items.push(this.queue[i]); }
            this.queue = _.drop(this.queue, this.waiting[0].count);
            this.waiting[0].resolve(items);
            this.waiting.shift();
        }
    }
}

function compilerText(stdout, stderr) {
    const ret = [];
    if (!EMPTY_STR.test(stdout)) ret.push(stdout);
    if (!EMPTY_STR.test(stderr)) ret.push(stderr);
    ret.push('自豪的采用 HydroJudge 进行评测(github.com/hydro-dev/HydroJudge)');
    return ret.join('\n');
}

function copyInDir(dir) {
    const files = {};
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((f1) => {
            const p1 = `${dir}/${f1}`;
            if (fs.statSync(p1).isDirectory()) {
                fs.readdirSync(p1).forEach((f2) => {
                    files[`${f1}/${f2}`] = { src: `${dir}/${f1}/${f2}` };
                });
            } else files[f1] = { src: `${dir}/${f1}` };
        });
    }
    return files;
}

function restrictFile(p) {
    if (!p) return '/';
    if (p[0] === '/') p = '';
    return p.replace(/\.\./i, '');
}

function ensureFile(folder) {
    return (file, message) => {
        const f = path.join(folder, restrictFile(file));
        if (!fs.existsSync(f)) throw new FormatError(message + file);
        const stat = fs.statSync(f);
        if (!stat.isFile()) throw new FormatError(message + file);
        return f;
    };
}

module.exports = {
    Queue,
    max,
    sleep,
    compilerText,
    copyInDir,
    parseMemoryMB,
    parseTimeMS,
    parseFilename,
    cmd: parse,
    ensureFile,
};
