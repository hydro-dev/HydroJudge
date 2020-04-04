const
    fs = require('fs'),
    fsp = fs.promises,
    path = require('path'),
    { FormatError } = require('../error'),
    restrict = p => {
        if (!p) return '/';
        if (p[0] == '/') p = '';
        return p.replace(/\.\./i, '');
    },
    chkFile = folder => (file, message) => {
        let f = path.join(folder, restrict(file));
        if (!fs.existsSync(f)) throw new FormatError(message + file);
        let stat = fs.statSync(f);
        if (!stat.isFile()) throw new FormatError(message + file);
        return f;
    };

module.exports = async function readIniCases(folder) {
    let
        config = {
            checker_type: 'default',
            count: 0,
            subtasks: [],
            judge_extra_files: [],
            user_extra_files: []
        },
        checkFile = chkFile(folder);
    let config_file = (await fsp.readFile(path.resolve(folder, 'config.ini'))).toString();
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
                input: checkFile(`input/${line[0].toLowerCase()}`, '找不到输入文件 '),
                output: checkFile(`output/${line[1].toLowerCase()}`, '找不到输出文件 '),
                id: config.count
            }]
        });
    }
    return config;
};