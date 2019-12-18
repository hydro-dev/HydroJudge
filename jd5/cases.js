const
    fs = require('fs'),
    path = require('path'),
    readIniCases = require('./case/ini'),
    readYamlCases = require('./case/yaml'),
    readAutoCases = require('./case/auto');

async function readCases(folder, extra_config = {}) {
    let config;
    if (fs.existsSync(folder + '/config.ini')) config = await readIniCases(folder);
    else if (fs.existsSync(path.resolve(folder, 'config.yaml'))) config = await readYamlCases(folder, 'config.yaml');
    else if (fs.existsSync(path.resolve(folder, 'Config.yaml'))) config = await readYamlCases(folder, 'Config.yaml');
    else config = await readAutoCases(folder);
    return Object.assign(extra_config, config);
}
module.exports = readCases;
