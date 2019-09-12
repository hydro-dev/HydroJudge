const
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    yaml = require('js-yaml'),
    { FormatError, SystemError } = require('./error'),
    { parseTimeMS, parseMemoryMB } = require('./utils'),
    restrict = path => {
        if (path[0] == '/') path = '';
        return path.replace(/\.\./i, '');
    },
    CASES = [
        [/^([a-zA-Z]*)([0-9]+).in$/, a => { return a[1] + a[2] + '.out'; }, a => { return parseInt(a[2]); }],
        [/^([a-zA-Z]*)([0-9]+).in$/, a => { return a[1] + a[2] + '.ans'; }, a => { return parseInt(a[2]); }],
        [/^([a-zA-Z0-9]*)\.in([0-9]+)$/, a => { return a[1] + '.ou' + a[2]; }, a => { return parseInt(a[2]); }],
        [/^(input)([0-9]+).txt$/, a => { return 'output' + a[2] + '.txt'; }, a => { return parseInt(a[2]); }],
    ];

async function read_ini_cases(folder) {
    let config = {
        checker_type: 'builtin',
        count: 0,
        subtasks: []
    };
    try {
        let config_file = (await fsp.readFile(path.resolve(folder, 'Config.ini'))).toString();
        config_file = config_file.split('\n');
        let count = parseInt(config_file[0]);
        for (let i = 1; i <= count; i++) {
            let line = config_file[i].split('|');
            config.count++;
            let cfg = {
                input: path.join(folder + restrict(line[0])),
                output: path.join(folder + restrict(line[1])),
                id: config.count
            };
            if (!fs.existsSync(cfg.input)) throw new FormatError('Input file not found:', [line[0]]);
            if (!fs.existsSync(cfg.output)) throw new FormatError('Output file not found', [line[1]]);
            config.subtasks.push({
                score: parseInt(line[3]),
                time_limit_ms: parseInt(parseFloat(line[2]) * 1000),
                memory_limit_mb: parseInt(line[4]) / 1024,
                cases: [cfg]
            });
        }
    } catch (e) {
        throw new FormatError('Invalid file: Config.ini');
    }
    return config;
}
async function read_yaml_cases(folder) {
    let config = {
        checker_type: 'builtin',
        count: 0,
        subtasks: []
    };
    try {
        let config_file = (await fsp.readFile(path.resolve(folder, 'config.yaml'))).toString();
        config_file = yaml.safeLoad(config_file);
        if (config_file.checker) {
            config.checker = path.join(folder, restrict(config_file.checker));
            if (config_file.checker_type) config.checker_type = config_file.checker_type;
        }
        if (!fs.existsSync(config.checker)) throw new FormatError('Checker not found.', [config_file.checker]);
        if (config_file.cases) { //Legacy format
            for (let c of config_file.cases) {
                config.count++;
                let cfg = {
                    input: path.join(folder + restrict(c.input)),
                    output: path.join(folder + restrict(c.output)),
                    id: config.count
                };
                if (!fs.existsSync(cfg.input)) throw new FormatError('Input file not found:', [c.input]);
                if (!fs.existsSync(cfg.output)) throw new FormatError('Output file not found', [c.output]);
                config.subtasks.push({
                    score: parseInt(c.score),
                    time_limit_ms: parseTimeMS(c.time),
                    memory_limit_mb: parseMemoryMB(c.memory),
                    cases: [cfg]
                });
            }
        } else if (config_file.subtasks) { //New format
            for (let subtask of config_file.subtasks) {
                let cases = [];
                for (let c of subtask) {
                    config.count++;
                    let cfg = {
                        input: path.join(folder + restrict(c.input)),
                        output: path.join(folder + restrict(c.output)),
                        id: config.count
                    };
                    if (!fs.existsSync(cfg.input)) throw new FormatError('Input file not found:', [c.input]);
                    if (!fs.existsSync(cfg.output)) throw new FormatError('Output file not found', [c.output]);
                    cases.push(cfg);
                }
                config.subtasks.push({
                    score: parseInt(subtask.score), cases,
                    time_limit_ms: parseTimeMS(subtask.time),
                    memory_limit_mb: parseMemoryMB(subtask.memory)
                });
            }
        }
    } catch (e) {
        throw new FormatError('Invalid file: config.yaml');
    }
    return config;
}
async function read_auto_cases(folder) {
    let config = {
        checker_type: 'builtin',
        count: 0,
        subtasks: []
    };
    try {
        let files = await fsp.readdir(folder);
        let cases = [];
        for (let file of files)
            for (let REG in CASES)
                if (REG[0].test(file)) {
                    let data = REG[0].exec(file);
                    let c = { input: file, output: REG[1](data), sort: REG[2](data) };
                    if (!fs.existsSync(path.resolve(folder, c.output))) continue;
                    cases.push(c);
                    break;
                }
        cases.sort((a, b) => { return a.sort - b.sort; });
        let basic = Math.floor(100 / cases.length);
        let extra = 100 % cases.length;
        for (let i in cases) {
            config.count++;
            config.subtasks.push({
                score: i > extra ? (basic + 1) : basic,
                time_limit_ms: 1000,
                memory_limit_mb: 256,
                cases: [{
                    id: config.count,
                    input: cases[i].input,
                    output: cases[i].output
                }]
            });
        }
    } catch (e) {
        throw new SystemError('Failed to read cases.');
    }
    if (!config.count) throw new FormatError('No cases found.');
    return config;
}
async function read_cases(folder) {
    if (fs.existsSync(path.resolve(folder, 'Config.ini'))) return read_ini_cases(folder);
    else if (fs.existsSync(path.resolve(folder, 'config.yaml'))) return read_yaml_cases(folder);
    else return read_auto_cases(folder);
}
module.exports = read_cases;
