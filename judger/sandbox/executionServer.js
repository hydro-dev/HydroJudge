const Axios = require('axios');
const fs = require('fs');
const {
    SYSTEM_MEMORY_LIMIT_MB, SYSTEM_PROCESS_LIMIT, SYSTEM_TIME_LIMIT_MS, EXECUTION_HOST,
} = require('../config');
const { SystemError } = require('../error');
const { cmd } = require('../utils');

const fsp = fs.promises;
const env = ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOME=/w'];
const axios = Axios.create({ baseURL: EXECUTION_HOST });

function proc({
    execute,
    time_limit_ms = SYSTEM_TIME_LIMIT_MS,
    memory_limit_mb = SYSTEM_MEMORY_LIMIT_MB,
    process_limit = SYSTEM_PROCESS_LIMIT,
    stdin, copyIn = {}, copyOut = [], copyOutCached = [],
} = {}) {
    for (const i in copyIn) {
        if (copyIn[i].src) { copyIn[i] = { content: fs.readFileSync(copyIn[i].src).toString() }; }
    }
    return {
        args: cmd(execute.replace(/\$\{dir\}/g, '/w')),
        env,
        files: [
            stdin ? { content: fs.readFileSync(stdin).toString() } : { content: '' },
            { name: 'stdout', max: 10240 },
            { name: 'stderr', max: 10240 },
        ],
        cpuLimit: time_limit_ms * 1000 * 1000,
        readCpuLimit: time_limit_ms * 1200 * 1000,
        memoryLimit: memory_limit_mb * 1024 * 1024,
        procLimit: process_limit,
        copyIn,
        copyOut,
        copyOutCached,
    };
}

async function runMultiple(execute) {
    let res;
    try {
        const body = {
            cmd: [
                proc(execute[0]),
                proc(execute[1]),
            ],
            pipeMapping: [{
                in: { index: 0, fd: 1 },
                out: { index: 1, fd: 0 },
            }, {
                in: { index: 1, fd: 1 },
                out: { index: 0, fd: 0 },
            }],
        };
        body.cmd[0].files[0] = null;
        body.cmd[0].files[1] = null;
        body.cmd[1].files[0] = null;
        body.cmd[1].files[1] = null;
        res = await axios.post('/run', body);
    } catch (e) {
        throw new SystemError('Cannot connect to sandbox service');
    }
    return res.data;
}

async function del(fileId) {
    const res = await axios.delete(`/file/${fileId}`);
    return res.data;
}

async function run(execute, params) {
    let result;
    // eslint-disable-next-line no-return-await
    if (typeof execute === 'object') return await runMultiple(execute);
    try {
        const body = { cmd: [proc({ execute, ...params })] };
        const res = await axios.post('/run', body);
        [result] = res.data;
    } catch (e) {
        throw new SystemError('Cannot connect to sandbox service');
    }
    const ret = {
        status: result.status,
        time_usage_ms: result.time / 1000000,
        memory_usage_kb: result.memory / 1024,
        files: result.files,
    };
    result.files = result.files || {};
    if (params.stdout) await fsp.writeFile(params.stdout, result.files.stdout || '');
    else ret.stdout = result.files.stdout || '';
    if (params.stderr) await fsp.writeFile(params.stderr, result.files.stderr || '');
    else ret.stderr = result.files.stderr || '';
    if (result.error) {
        ret.error = result.error;
    }
    ret.files = result.files;
    ret.fileIds = result.fileIds || {};
    return ret;
}

module.exports = { del, run, runMultiple };
