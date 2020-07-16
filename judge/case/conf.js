const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const { FormatError } = require('../error');
const readAutoCases = require('./auto');

const fsp = fs.promises;

module.exports = async function readConfCases(folder, filename, { next }) {
    next({ judge_text: '警告：检测到 problem.conf 配置文件。暂不支持对ex测试点的评测。' });
    const
        config = {
            checker_type: 'default',
            count: 0,
            subtasks: [],
            judge_extra_files: [],
            user_extra_files: [],
        };
    const map = {};
    try {
        const configFile = (await fsp.readFile(path.resolve(folder, 'problem.conf'))).toString().split('\n');
        for (const line of configFile) {
            const i = line.split(' ');
            map[i[0]] = i[1]; // eslint-disable-line prefer-destructuring
        }
        assert(map.use_builtin_judge);
        assert(map.use_builtin_checker);
        assert(map.n_tests);
        assert(map.n_ex_tests);
        assert(map.n_sample_tests);
        assert(map.input_pre);
        assert(map.input_suf);
        assert(map.output_pre);
        assert(map.output_suf);
        assert(map.time_limit);
        assert(map.memory_limit);
    } catch (e) {
        throw new FormatError('无效的 problem.conf 文件。', [e]);
    }
    const c = await readAutoCases(folder, '', { next });
    config.subtasks = c.subtasks;
    config.count = c.count;
    for (const i in config.subtasks) {
        config.subtasks[i].memory_limit_mb = map.memory_limit;
        config.subtasks[i].time_limit_ms = map.time_limit * 1000;
    }
    return config;
};
