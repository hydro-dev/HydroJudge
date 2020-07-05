const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { FormatError } = require('../error');
const { parseTimeMS, parseMemoryMB, ensureFile } = require('../utils');
const readAutoCases = require('./auto');

const fsp = fs.promises;

module.exports = async function readYamlCases(folder, name, args) {
    const config = {
        checker_type: 'default',
        count: 0,
        subtasks: [],
        judge_extra_files: [],
        user_extra_files: [],
    };
    const next = args.next;
    const checkFile = ensureFile(folder);
    let configFile = args.config || (await fsp.readFile(path.resolve(folder, name))).toString();

    configFile = yaml.safeLoad(configFile);
    config.checker_type = configFile.checker_type || 'default';
    if (configFile.filename) config.filename = configFile.filename;
    if (configFile.checker) config.checker = checkFile(configFile.checker, '找不到比较器 ');
    if (configFile.judge_extra_files) {
        if (typeof configFile.judge_extra_files === 'string') {
            config.judge_extra_files = [checkFile(configFile.judge_extra_files, '找不到评测额外文件 ')];
        } else if (configFile.judge_extra_files instanceof Array) {
            for (const file in configFile.judge_extra_files) {
                config.judge_extra_files.push(checkFile(file, '找不到评测额外文件 '));
            }
        } else throw new FormatError('无效的 judge_extra_files 配置项');
    }
    if (configFile.user_extra_files) {
        if (typeof configFile.user_extra_files === 'string') {
            config.user_extra_files = [checkFile(configFile.user_extra_files, '找不到用户额外文件 ')];
        } else if (configFile.user_extra_files instanceof Array) {
            for (const file in configFile.user_extra_files) {
                config.user_extra_files.push(checkFile(file, '找不到用户额外文件 '));
            }
        } else throw new FormatError('无效的 user_extra_files 配置项');
    }
    if (configFile.cases) {
        config.subtasks = [{
            score: parseInt(configFile.score) || Math.floor(100 / config.count),
            time_limit_ms: parseTimeMS(configFile.time),
            memory_limit_mb: parseMemoryMB(configFile.memory),
            cases: [],
            type: 'sum',
        }];
        for (const c of configFile.cases) {
            config.count++;
            config.subtasks[0].cases.push({
                input: checkFile(c.input, '找不到输入文件 '),
                output: checkFile(c.output, '找不到输出文件 '),
                id: config.count,
            });
        }
    } else if (configFile.subtasks) {
        for (const subtask of configFile.subtasks) {
            const cases = [];
            for (const c of subtask) {
                config.count++;
                cases.push({
                    input: checkFile(c.input, '找不到输入文件 '),
                    output: checkFile(c.output, '找不到输出文件 '),
                    id: config.count,
                });
            }
            config.subtasks.push({
                score: parseInt(subtask.score),
                cases,
                time_limit_ms: parseTimeMS(subtask.time || configFile.time),
                memory_limit_mb: parseMemoryMB(subtask.memory || configFile.time),
            });
        }
    } else if (configFile.type !== 'remotejudge') {
        const c = await readAutoCases(folder, '', { next });
        config.subtasks = c.subtasks;
        config.count = c.count;
    }
    return Object.assign(configFile, config);
};
