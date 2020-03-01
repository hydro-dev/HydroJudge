const
    fs = require('fs'),
    fsp = fs.promises,
    yaml = require('js-yaml'),
    path = require('path'),
    { FormatError } = require('../error'),
    { parseTimeMS, parseMemoryMB } = require('../utils'),
    readAutoCases = require('./auto'),
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

module.exports = async function readYamlCases(folder, name) {
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
    if (config_file.filename) config.filename = config_file.filename;
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
        config.subtasks = [{
            score: parseInt(config_file.score) || Math.floor(100 / config.count),
            time_limit_ms: parseTimeMS(config_file.time),
            memory_limit_mb: parseMemoryMB(config_file.memory),
            cases: [],
            type: 'sum'
        }];
        for (let c of config_file.cases) {
            config.count++;
            config.subtasks[0].cases.push({
                input: checkFile(c.input, 'Input file {0} not found.'),
                output: checkFile(c.output, 'Output file {0} not found.'),
                id: config.count
            });
        }
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
    else if (!config.type == 'remotejudge') {
        let c = await readAutoCases(folder);
        config.subtasks = c.subtasks;
        config.count = c.count;
    }
    return Object.assign(config_file, config);
};