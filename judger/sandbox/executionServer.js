const
    { SYSTEM_MEMORY_LIMIT_MB, SYSTEM_PROCESS_LIMIT, SYSTEM_TIME_LIMIT_MS, EXECUTION_HOST } = require('../config'),
    Axios = require('axios'),
    fs = require('fs'),
    fsp = fs.promises,
    { SystemError } = require('../error'),
    { cmd } = require('../utils');

const env = ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOME=/w'];
const axios = Axios.create({ baseURL: EXECUTION_HOST });

function proc({
    execute,
    time_limit_ms = SYSTEM_TIME_LIMIT_MS,
    memory_limit_mb = SYSTEM_MEMORY_LIMIT_MB,
    process_limit = SYSTEM_PROCESS_LIMIT,
    stdin, copyIn = {}, copyOut = [], copyOutCached = []
} = {}) {
    return {
        args: cmd(execute.replace(/\$\{dir\}/g, '/w')), env,
        files: [
            stdin ? { src: stdin } : { content: '' },
            { name: 'stdout', max: 10240 },
            { name: 'stderr', max: 10240 }
        ],
        cpuLimit: time_limit_ms * 1000 * 1000,
        readCpuLimit: time_limit_ms * 1200 * 1000,
        memoryLimit: memory_limit_mb * 1024 * 1024,
        procLimit: process_limit,
        copyIn, copyOut, copyOutCached
    };
}

async function runMultiple(execute) {
    let res;
    try {
        let body = {
            cmd: [
                proc(execute[0]),
                proc(execute[1])
            ],
            pipeMapping: [{
                in: { index: 0, fd: 1 },
                out: { index: 1, fd: 0 }
            }, {
                in: { index: 1, fd: 1 },
                out: { index: 0, fd: 0 }
            }]
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

exports.del = async function (fileId) {
    let res = await axios.delete(`/file/${fileId}`);
    return res.data;
};

exports.run = async function (execute, params) {
    let result;
    if (typeof execute == 'object') return await runMultiple(execute);
    try {
        let body = { cmd: [proc(Object.assign({ execute }, params))] };
        let res = await axios.post('/run', body);
        result = res.data[0];
    } catch (e) {
        throw new SystemError('Cannot connect to sandbox service');
    }
    let ret = {
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
};
