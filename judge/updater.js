const axios = require('axios');
const log = require('./log');
const { version } = require('../package.json');

const remote = 'https://cdn.jsdelivr.net/gh/hydro-dev/HydroJudge/package.json';

(async () => {
    let hasUpgrade = 0; let
        rversion = null;
    const response = await axios.get(remote).catch((e) => {
        if (!hasUpgrade) hasUpgrade = e.code;
    });
    if (response) {
        rversion = response.data.version;
        if (!rversion) rversion = JSON.parse(response.data).version;
        if (rversion !== version) hasUpgrade = 1;
    }
    if (hasUpgrade === 1) {
        log.log(`正在运行 ${version}, 最新版本为 ${rversion}`);
    } else if (typeof hasUpgrade === 'string') {
        log.warn('检查更新时发生了错误。', hasUpgrade);
    } else {
        log.log('没有可用更新。');
    }
})().catch((e) => {
    log.error('Cannot check update:', e);
});
