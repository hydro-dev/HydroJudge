const
    axios = require('axios'),
    remote = [
        'https://raw.githubusercontent.com/masnn/jd5/master/package.json',
        'https://cdn.jsdelivr.net/gh/masnn/jd5/package.json',
    ],
    version = require('../package.json').version;

(async () => {
    let hasUpgrade = 0;
    for (let url of remote) {
        let response = await axios.get(url).catch(() => {
            if (hasUpgrade == 0) hasUpgrade = -1;
        });
        let rversion = response.data.version;
        if (rversion) rversion = JSON.parse(response.data).version;
        if (rversion != version) {
            hasUpgrade = 1;
            break;
        }
    }
    if (hasUpgrade == 1) {
        console.log('An upgrade has detected, use "git pull" to upgrade.');
    } else if (hasUpgrade == -1) {
        console.warn('Cannot connect to upgrade manager, please check your internet connection.');
    }
})().catch(e => {
    console.error('Cannot check update:', e);
});
