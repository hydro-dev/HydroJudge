const
    fs = require('fs'),
    path = require('path'),
    { FormatError } = require('./error'),
    readIniCases = require('./case/ini'),
    readYamlCases = require('./case/yaml'),
    readAutoCases = require('./case/auto'),
    readConfCases = require('./case/conf');

let map = [
    ['config.ini', readIniCases],
    ['config.yaml', readYamlCases],
    ['Config.yaml', readYamlCases],
    ['config.yml', readYamlCases],
    ['Config.yml', readYamlCases],
    ['problem.conf', readConfCases]
];

async function readCases(folder, extra_config = {}) {
    let config;
    let d = fs.readdirSync(folder);
    if (d.length == 2) {
        d.splice(d.indexOf('version'));
        let s = fs.statSync(path.resolve(folder, d[0]));
        if (s.isDirectory()) folder = path.resolve(folder, d[0]);
    }
    for (let [filename, handler] of map)
        if (fs.existsSync(path.resolve(folder, filename))) {
            config = await handler(folder, filename);
            break;
        }
    if (!config) config = await readAutoCases(folder);
    config = Object.assign(extra_config, config);
    if (config.type != 'remotejudge' && !config.count) throw new FormatError('No cases found.');
    return config;
}
module.exports = readCases;
