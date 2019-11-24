const fs = require('fs');

class CompileError extends Error {
    constructor({ stdout, stderr } = {}) {
        let out = '', err = '';
        let len = fs.statSync(stdout).size + fs.statSync(stderr).size;
        if (len <= 4096) {
            if (stdout) out = fs.readFileSync(stdout).toString();
            if (stderr) err = fs.readFileSync(stderr).toString();
            super([out, err].join('\n'));
            this.stdout = out;
            this.stderr = err;
        } else {
            super('Compiler output limit exceeded.');
            this.stdout = '/dev/null';
            this.stderr = '/dev/null';
        }
        this.type = 'CompileError';
    }
}
class FormatError extends Error {
    constructor(message, params = []) {
        super(message);
        this.type = 'FormatError';
        this.params = params;
    }
}
class RuntimeError extends Error {
    constructor(detail, message) {
        super(message);
        this.type = 'RuntimeError';
        this.detail = detail;
    }
}
class SystemError extends Error {
    constructor(message, params = []) {
        super(message);
        this.type = 'SystemError';
        this.params = params;
    }
}

module.exports = {
    CompileError,
    FormatError,
    RuntimeError,
    SystemError
};
