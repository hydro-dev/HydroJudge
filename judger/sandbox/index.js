const os = require('os');
if (os.platform() == 'linux') module.exports = require('./executionServer.js');
else throw new Error('Unsupported platform: ', os.platform());