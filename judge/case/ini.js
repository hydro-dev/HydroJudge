const fs = require('fs-extra');
const path = require('path');
const { FormatError } = require('../error');
const { ensureFile } = require('../utils');

const fsp = fs.promises;

module.exports = async function readIniCases(folder) {
    const
        config = {
            checker_type: 'default',
            count: 0,
            subtasks: [],
            judge_extra_files: [],
            user_extra_files: [],
        };
    const checkFile = ensureFile(folder);
    let configFile = (await fsp.readFile(path.resolve(folder, 'config.ini'))).toString();
    configFile = configFile.split('\n');
    try {
        const count = parseInt(configFile[0]);
        if (!count) throw new FormatError('line 1');
        for (let i = 1; i <= count; i++) {
            const line = configFile[i].split('|');
            if (!parseFloat(line[2]) || !parseInt(line[3])) throw new FormatError(`line ${1 + i}`);
            config.count++;
            config.subtasks.push({
                score: parseInt(line[3]),
                time_limit_ms: parseInt(parseFloat(line[2]) * 1000),
                memory_limit_mb: parseInt(line[4]) / 1024 || 256,
                cases: [{
                    input: checkFile(`input/${line[0].toLowerCase()}`, '找不到输入文件 '),
                    output: checkFile(`output/${line[1].toLowerCase()}`, '找不到输出文件 '),
                    id: config.count,
                }],
            });
        }
    } catch (e) {
        throw new FormatError('无效的 config.ini 。');
    }
    return config;
};
