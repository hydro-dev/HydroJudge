const
    fs = require('fs'),
    path = require('path'),
    readIniCases = require('./case/ini'),
    readYamlCases = require('./case/yaml'),
    readAutoCases = require('./case/auto'),
    readConfCases = require('./cases/conf');

let map = [
    ['config.ini', readIniCases],
    ['Config.ini', readIniCases],
    ['config.yaml', readYamlCases],
    ['Config.yaml', readYamlCases],
    ['config.yml', readYamlCases],
    ['Config.yml', readYamlCases],
    ['problem.conf', readConfCases]
];

async function readCases(folder, extra_config = {}) {
    let config;
    for (let [filename, handler] in map)
        if (fs.existsSync(path.resolve(folder, filename))) {
            config = await handler(folder, filename);
            break;
        }
    if (!config) config = await readAutoCases(folder);
    return Object.assign(extra_config, config);
}
module.exports = readCases;
