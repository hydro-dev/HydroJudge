const fs = require('fs');
const path = require('path');
const { FormatError } = require('./error');
const readIniCases = require('./case/ini');
const readYamlCases = require('./case/yaml');
const readAutoCases = require('./case/auto');
const readConfCases = require('./case/conf');

const map = [
    ['config.ini', readIniCases],
    ['config.yaml', readYamlCases],
    ['Config.yaml', readYamlCases],
    ['config.yml', readYamlCases],
    ['Config.yml', readYamlCases],
    ['problem.conf', readConfCases],
];

async function readCases(folder, extra_config = {}, args) {
    args = args || {};
    args.next = args.next || (() => { });
    let config;
    const d = fs.readdirSync(folder);
    if (d.length === 2) {
        d.splice(d.indexOf('version'));
        const s = fs.statSync(path.resolve(folder, d[0]));
        if (s.isDirectory()) folder = path.resolve(folder, d[0]);
    }
    for (const [filename, handler] of map) {
        if (fs.existsSync(path.resolve(folder, filename))) {
            config = await handler(folder, filename, args); // eslint-disable-line no-await-in-loop
            break;
        }
    }
    if (!config) {
        args.next({ judge_text: '您没有提供题目配置文件。正在使用默认时空限制 1s 256M 。' });
        config = await readAutoCases(folder, '', args);
    }
    config = Object.assign(extra_config, config);
    if (config.type !== 'remotejudge' && !config.count) throw new FormatError('没有找到测试数据');
    return config;
}
module.exports = readCases;
