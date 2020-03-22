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
        log.log(`Running ${version}, Found newest version ${rversion}`);
    } else if (typeof hasUpgrade == 'string') {
        log.warn('Cannot connect to upgrade manager, please check your internet connection.', hasUpgrade);
    } else {
        log.log('No upgrade aviliable.');
    }
})().catch(e => {
    log.error('Cannot check update:', e);
});
