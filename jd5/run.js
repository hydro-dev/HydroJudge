const
    { SYSTEM_MEMORY_LIMIT_MB, SYSTEM_PROCESS_LIMIT, SYSTEM_TIME_LIMIT_MS, EXECUTION_HOST } = require('./config'),
    Axios = require('axios'),
    fs = require('fs'),
    fsp = fs.promises,
    { cmd } = require('./utils');

const env = ['PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOME=/w'];
const axios = Axios.create({ baseURL: EXECUTION_HOST });
module.exports = async function run(execute, {
    time_limit_ms = SYSTEM_TIME_LIMIT_MS,
    memory_limit_mb = SYSTEM_MEMORY_LIMIT_MB,
    process_limit = SYSTEM_PROCESS_LIMIT,
    stdin, stdout, stderr,
    copyIn = {}, copyOut = [], copyOutCached = []
} = {}) {
    execute = execute.replace(/\$\{dir\}/g, '/w');
    let args = cmd(execute), result, body;
    try {
        body = {
            cmd: [{
                args, env,
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
            }]
        };
        let res = await axios.post('/run', body);
        result = res.data[0];
    } catch (e) {
        console.log(e);
    }
    let ret = {
        status: result.status,
        time_usage_ms: result.time / 1000000,
        memory_usage_kb: result.memory / 1024,
        files: result.files,
    };
    result.files = result.files || {};
    if (stdout) await fsp.writeFile(stdout, result.files.stdout || '');
    else ret.stdout = result.files.stdout || '';
    if (stderr) await fsp.writeFile(stderr, result.files.stderr || '');
    else ret.stderr = result.files.stderr || '';
    if (result.error) {
        ret.error = result.error;
    }
    ret.files = result.files;
    ret.fileIds = result.fileIds || {};
    return ret;
};
