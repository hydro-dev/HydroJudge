const
    axios = require('axios'),
    log = require('./log'),
    remote = 'https://cdn.jsdelivr.net/gh/hydro-dev/HydroJudger/package.json',
    version = require('../package.json').version;

(async () => {
    let hasUpgrade = 0, rversion = null;
    let response = await axios.get(remote).catch(e => {
        if (!hasUpgrade) hasUpgrade = e.code;
    });
    if (response) {
        rversion = response.data.version;
        if (!rversion) rversion = JSON.parse(response.data).version;
        if (rversion != version) hasUpgrade = 1;
    }
    if (hasUpgrade == 1) {
        log.log(`正在运行 ${version}, 最新版本为 ${rversion}`);
    } else if (typeof hasUpgrade == 'string') {
        log.warn('检查更新时发生了错误。', hasUpgrade);
    } else {
        log.log('没有可用更新。');
    }
})().catch(e => {
    log.error('Cannot check update:', e);
});
