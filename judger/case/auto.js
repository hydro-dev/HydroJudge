const
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    { SystemError, FormatError } = require('../error'),
    restrict = p => {
        if (!p) return '/';
        if (p[0] == '/') p = '';
        return p.replace(/\.\./i, '');
    },
    chkFile = folder => (file, message) => {
        let f = path.join(folder, restrict(file));
        if (!fs.existsSync(f)) throw new FormatError(message, [file]);
        let stat = fs.statSync(f);
        if (!stat.isFile()) throw new FormatError(message, [file]);
        return f;
    };

const
    RE0 = [
        {
            reg: /^([a-zA-Z]*)([0-9]+).in$/,
            output: a => a[1] + a[2] + '.out',
            id: a => parseInt(a[2]),
        },
        {
            reg: /^([a-zA-Z]*)([0-9]+).in$/,
            output: a => a[1] + a[2] + '.ans',
            id: a => parseInt(a[2]),
        },
        {
            reg: /^([a-zA-Z0-9]*)\.in([0-9]+)$/,
            output: a => a[1] + '.ou' + a[2],
            id: a => parseInt(a[2]),
        },
        {
            reg: /^(input)([0-9]+).txt$/,
            output: a => 'output' + a[2] + '.txt',
            id: a => parseInt(a[2]),
        }
    ],
    RE1 = [
        {
            reg: /^([a-zA-Z]*)([0-9]+)-([0-9]+).in$/,
            output: a => a[1] + a[2] + '-' + a[3] + '.out',
            subtask: a => parseInt(a[2]),
            id: a => parseInt(a[3])
        }
    ];

async function read0(folder, files, checkFile) {
    let cases = [];
    for (let file of files)
        for (let REG of RE0)
            if (REG.reg.test(file)) {
                let data = REG.reg.exec(file);
                let c = { input: file, output: REG.output(data), id: REG.id(data) };
                if (!fs.existsSync(path.resolve(folder, c.output))) continue;
                cases.push(c);
                break;
            }
    cases.sort((a, b) => (a.id - b.id));
    let extra = cases.length - 100 % cases.length;
    let config = {
        count: 0,
        subtasks: [{
            time_limit_ms: 1000,
            memory_limit_mb: 256,
            type: 'sum',
            cases: [],
            score: Math.floor(100 / cases.length)
        }]
    };
    for (let i = 0; i < extra; i++) {
        config.count++;
        config.subtasks[0].cases.push({
            id: config.count,
            input: checkFile(cases[i].input),
            output: checkFile(cases[i].output)
        });
    }
    if (extra < cases.length) {
        config.subtasks.push({
            time_limit_ms: 1000,
            memory_limit_mb: 256,
            type: 'sum',
            cases: [],
            score: Math.floor(100 / cases.length) + 1
        });
        for (let i = extra; i < cases.length; i++) {
            config.count++;
            config.subtasks[1].cases.push({
                id: config.count,
                input: checkFile(cases[i].input),
                output: checkFile(cases[i].output)
            });
        }
    }
    return config;
}

async function read1(folder, files, checkFile) {
    let subtask = {}, subtasks = [];
    for (let file of files)
        for (let REG of RE1)
            if (REG.reg.test(file)) {
                let data = REG.reg.exec(file);
                let c = { input: file, output: REG.output(data), id: REG.id(data) };
                if (!fs.existsSync(path.resolve(folder, c.output))) continue;
                if (!subtask[REG.subtask(data)])
                    subtask[REG.subtask(data)] = [{
                        time_limit_ms: 1000,
                        memory_limit_mb: 256,
                        type: 'min',
                        cases: [c],
                    }];
                else subtask[REG.subtask(data)].cases.push(c);
                break;
            }
    for (let i in subtask) {
        subtask[i].cases.sort((a, b) => (a.id - b.id));
        subtasks.push(subtask[i]);
    }
    let base = Math.floor(100 / subtask.length);
    let extra = subtasks.length - 100 % subtask.length;
    let config = { count: 0, subtasks };
    for (let i in subtask) {
        if (extra < i) subtask[i].score = base;
        else subtask[i].score = base + 1;
        for (let j of subtask[i].cases) {
            config.count++;
            j.input = checkFile(j.input);
            j.output = checkFile(j.output);
            j.id = config.count;
        }
    }
    return config;
}

module.exports = async function readAutoCases(folder) {
    let
        config = {
            checker_type: 'default',
            count: 0,
            subtasks: [],
            judge_extra_files: [],
            user_extra_files: []
        },
        checkFile = chkFile(folder);
    try {
        let files = await fsp.readdir(folder);
        let result = await read0(folder, files, checkFile);
        if (!result.count) result = await read1(folder, files, checkFile);
        Object.assign(config, result);
    } catch (e) {
        throw new SystemError('Failed to read cases.', [e]);
    }
    if (!config.count) throw new FormatError('No cases found.');
    return config;
};
