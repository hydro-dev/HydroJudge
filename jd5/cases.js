const
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    yaml = require('js-yaml'),
    { FormatError, SystemError } = require('./error'),
    { parseTimeMS, parseMemoryMB } = require('./utils'),
    restrict = p => {
        if (!p) return '/';
        if (p[0] == '/') p = '';
        return p.replace(/\.\./i, '');
    },
    CASES = [
        [/^([a-zA-Z]*)([0-9]+).in$/, a => a[1] + a[2] + '.out', a => parseInt(a[2])],
        [/^([a-zA-Z]*)([0-9]+).in$/, a => a[1] + a[2] + '.ans', a => parseInt(a[2])],
        [/^([a-zA-Z0-9]*)\.in([0-9]+)$/, a => a[1] + '.ou' + a[2], a => parseInt(a[2])],
        [/^(input)([0-9]+).txt$/, a => 'output' + a[2] + '.txt', a => parseInt(a[2])],
    ],
    chkFile = folder => (file, message) => {
        let f = path.join(folder, restrict(file));
        if (!fs.existsSync(f)) throw new FormatError(message, [file]);
        let stat = fs.statSync(f);
        if (!stat.isFile()) throw new FormatError(message, [file]);
        return f;
    };

async function readIniCases(folder) {
    let
        config = {
            checker_type: 'default',
            count: 0,
            subtasks: [],
            judge_extra_files: [],
            user_extra_files: []
        },
        checkFile = chkFile(folder),
        config_file = (await fsp.readFile(path.resolve(folder, 'Config.ini'))).toString();
    config_file = config_file.split('\n');
    let count = parseInt(config_file[0]);
    for (let i = 1; i <= count; i++) {
        let line = config_file[i].split('|');
        config.count++;
        config.subtasks.push({
            score: parseInt(line[3]),
            time_limit_ms: parseInt(parseFloat(line[2]) * 1000),
            memory_limit_mb: parseInt(line[4]) / 1024 || 256,
            cases: [{
                input: checkFile('Input/' + line[0], 'Input file {0} not found.'),
                output: checkFile('Output/' + line[1], 'Output file {0} not found.'),
                id: config.count
            }]
        });
    }
    return config;
}
async function readYamlCases(folder, name) {
    let
        config = {
            checker_type: 'default',
            count: 0,
            subtasks: [],
            judge_extra_files: [],
            user_extra_files: []
        },
        checkFile = chkFile(folder),
        config_file = (await fsp.readFile(path.resolve(folder, name))).toString();

    config_file = yaml.safeLoad(config_file);
    config.checker_type = config_file.checker_type || 'default';
    if (config_file.checker) config.checker = checkFile(config_file.checker, 'Checker {0} not found.');
    if (config_file.judge_extra_files) {
        if (typeof config_file.judge_extra_files == 'string')
            config.judge_extra_files = [checkFile(config_file.judge_extra_files, 'Judge extra file {0} not found.')];
        else if (config_file.judge_extra_files instanceof Array) {
            for (let file in config_file.judge_extra_files)
                config.judge_extra_files.push(checkFile(file, 'Judge extra file {0} not found.'));
        } else throw new FormatError('Cannot parse option `judge_extra_files`');
    }
    if (config_file.user_extra_files) {
        if (typeof config_file.user_extra_files == 'string')
            config.user_extra_files = [checkFile(config_file.user_extra_files, 'User extra file {0} not found.')];
        else if (config_file.user_extra_files instanceof Array) {
            for (let file in config_file.user_extra_files)
                config.user_extra_files.push(checkFile(file, 'User extra file {0} not found.'));
        } else throw new FormatError('Cannot parse option `user_extra_files`');
    }
    if (config_file.cases) {
        for (let c of config_file.cases) {
            config.count++;
            config.subtasks.push({
                score: parseInt(c.score),
                time_limit_ms: parseTimeMS(c.time || config_file.time),
                memory_limit_mb: parseMemoryMB(c.memory || config_file.memory),
                cases: [{
                    input: checkFile(c.input, 'Input file {0} not found.'),
                    output: checkFile(c.output, 'Output file {0} not found.'),
                    id: config.count
                }]
            });
        }
        for (let c of config.subtasks)
            if (!c.score) c.score = Math.floor(100 / config.count);
    } else if (config_file.subtasks)
        for (let subtask of config_file.subtasks) {
            let cases = [];
            for (let c of subtask) {
                config.count++;
                cases.push({
                    input: checkFile(c.input, 'Input file {0} not found.'),
                    output: checkFile(c.output, 'Output file {0} not found.'),
                    id: config.count
                });
            }
            config.subtasks.push({
                score: parseInt(subtask.score), cases,
                time_limit_ms: parseTimeMS(subtask.time || config_file.time),
                memory_limit_mb: parseMemoryMB(subtask.memory || config_file.time)
            });
        }
    else {
        let c = await readAutoCases(folder);
        config.subtasks = c.subtasks;
        config.count = c.count;
    }
    return Object.assign(config_file, config);
}
async function readAutoCases(folder) {
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
        let cases = [];
        for (let file of files)
            for (let REG of CASES)
                if (REG[0].test(file)) {
                    let data = REG[0].exec(file);
                    let c = { input: file, output: REG[1](data), sort: REG[2](data) };
                    if (!fs.existsSync(path.resolve(folder, c.output))) continue;
                    cases.push(c);
                    break;
                }
        cases.sort((a, b) => { return a.sort - b.sort; });
        for (let i in cases) {
            config.count++;
            config.subtasks.push({
                score: Math.floor(100 / cases.length),
                time_limit_ms: 1000,
                memory_limit_mb: 256,
                cases: [{
                    id: config.count,
                    input: checkFile(cases[i].input),
                    output: checkFile(cases[i].output)
                }]
            });
        }
    } catch (e) {
        throw new SystemError('Failed to read cases.', [e]);
    }
    if (!config.count) throw new FormatError('No cases found.');
    return config;
}
async function readCases(folder) {
    if (fs.existsSync(path.resolve(folder, 'Config.ini'))) return readIniCases(folder);
    else if (fs.existsSync(path.resolve(folder, 'config.yaml'))) return readYamlCases(folder, 'config.yaml');
    else if (fs.existsSync(path.resolve(folder, 'Config.yaml'))) return readYamlCases(folder, 'Config.yaml');
    else return readAutoCases(folder);
}
module.exports = readCases;
