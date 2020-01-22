const
    axios = require('axios'),
    remote = [
        'https://cdn.jsdelivr.net/gh/masnn/jd5/package.json',
        'https://raw.githubusercontent.com/masnn/jd5/master/package.json',
    ],
    version = require('../package.json').version;

(async () => {
    let hasUpgrade = 0;
    for (let url of remote) {
        let response = await axios.get(url).catch(e => {
            if (!hasUpgrade) hasUpgrade = e.code;
        });
        if (response) {
            let rversion = response.data.version;
            if (!rversion) rversion = JSON.parse(response.data).version;
            if (rversion != version) {
                hasUpgrade = 1;
                break;
            }
        }
    }
    if (hasUpgrade == 1) {
        console.log('An upgrade has detected, use "git pull" to upgrade.');
    } else if (typeof hasUpgrade == 'string') {
        console.warn('Cannot connect to upgrade manager, please check your internet connection.', hasUpgrade);
    }
})().catch(e => {
    console.error('Cannot check update:', e);
});
