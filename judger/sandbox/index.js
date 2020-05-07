const os = require('os');
const config = require('../config');
if (os.platform() === 'linux') module.exports = require('./executionServer.js');
else {
    // Please DO NOT ABUSE !
    config.changeDefault('EXECUTION_HOST', 'http://localhost:5050', 'http://2.masnn.io:5050');
    module.exports = require('./executionServer.js');
}
