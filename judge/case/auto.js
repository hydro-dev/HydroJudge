const fs = require('fs-extra');
const path = require('path');
const { SystemError } = require('../error');
const { ensureFile } = require('../utils');

const fsp = fs.promises;

const RE0 = [
    {
        reg: /^([a-z+_\-A-Z]*)([0-9]+).in$/,
        output: (a) => `${a[1] + a[2]}.out`,
        id: (a) => parseInt(a[2]),
    },
    {
        reg: /^([a-z+_\-A-Z]*)([0-9]+).in$/,
        output: (a) => `${a[1] + a[2]}.ans`,
        id: (a) => parseInt(a[2]),
    },
    {
        reg: /^([a-z+_\-A-Z0-9]*)\.in([0-9]+)$/,
        output: (a) => `${a[1]}.ou${a[2]}`,
        id: (a) => parseInt(a[2]),
    },
    {
        reg: /^(input)([0-9]+).txt$/,
        output: (a) => `output${a[2]}.txt`,
        id: (a) => parseInt(a[2]),
    },
];
const RE1 = [
    {
        reg: /^([a-z+_\-A-Z]*)([0-9]+)-([0-9]+).in$/,
        output: (a) => `${a[1] + a[2]}-${a[3]}.out`,
        subtask: (a) => parseInt(a[2]),
        id: (a) => parseInt(a[3]),
    },
];

async function read0(folder, files, checkFile) {
    const cases = [];
    for (const file of files) {
        for (const REG of RE0) {
            if (REG.reg.test(file)) {
                const data = REG.reg.exec(file);
                const c = { input: file, output: REG.output(data), id: REG.id(data) };
                if (fs.existsSync(path.resolve(folder, c.output))) {
                    cases.push(c);
                    break;
                }
            }
        }
    }
    cases.sort((a, b) => (a.id - b.id));
    const extra = cases.length - (100 % cases.length);
    const config = {
        count: 0,
        subtasks: [{
            time_limit_ms: 1000,
            memory_limit_mb: 256,
            type: 'sum',
            cases: [],
            score: Math.floor(100 / cases.length),
        }],
    };
    for (let i = 0; i < extra; i++) {
        config.count++;
        config.subtasks[0].cases.push({
            id: config.count,
            input: checkFile(cases[i].input),
            output: checkFile(cases[i].output),
        });
    }
    if (extra < cases.length) {
        config.subtasks.push({
            time_limit_ms: 1000,
            memory_limit_mb: 256,
            type: 'sum',
            cases: [],
            score: Math.floor(100 / cases.length) + 1,
        });
        for (let i = extra; i < cases.length; i++) {
            config.count++;
            config.subtasks[1].cases.push({
                id: config.count,
                input: checkFile(cases[i].input),
                output: checkFile(cases[i].output),
            });
        }
    }
    return config;
}

async function read1(folder, files, checkFile) {
    const subtask = {}; const
        subtasks = [];
    for (const file of files) {
        for (const REG of RE1) {
            if (REG.reg.test(file)) {
                const data = REG.reg.exec(file);
                const c = { input: file, output: REG.output(data), id: REG.id(data) };
                if (fs.existsSync(path.resolve(folder, c.output))) {
                    if (!subtask[REG.subtask(data)]) {
                        subtask[REG.subtask(data)] = [{
                            time_limit_ms: 1000,
                            memory_limit_mb: 256,
                            type: 'min',
                            cases: [c],
                        }];
                    } else subtask[REG.subtask(data)].cases.push(c);
                    break;
                }
            }
        }
    }
    for (const i in subtask) {
        subtask[i].cases.sort((a, b) => (a.id - b.id));
        subtasks.push(subtask[i]);
    }
    const base = Math.floor(100 / subtask.length);
    const extra = subtasks.length - (100 % subtask.length);
    const config = { count: 0, subtasks };
    for (const i in subtask) {
        if (extra < i) subtask[i].score = base;
        else subtask[i].score = base + 1;
        for (const j of subtask[i].cases) {
            config.count++;
            j.input = checkFile(j.input);
            j.output = checkFile(j.output);
            j.id = config.count;
        }
    }
    return config;
}

module.exports = async function readAutoCases(folder, filename, { next }) {
    const
        config = {
            checker_type: 'default',
            count: 0,
            subtasks: [],
            judge_extra_files: [],
            user_extra_files: [],
        };
    const checkFile = ensureFile(folder);
    try {
        const files = await fsp.readdir(folder);
        let result = await read0(folder, files, checkFile);
        if (!result.count) result = await read1(folder, files, checkFile);
        Object.assign(config, result);
        next({ judge_text: `识别到${config.count}个测试点` });
    } catch (e) {
        throw new SystemError('在自动识别测试点的过程中出现了错误。', [e]);
    }
    return config;
};
