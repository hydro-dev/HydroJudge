const fs = require('fs');

class CompileError extends Error {
    constructor({ stdout, stderr }) {
        let out = fs.readFileSync(stdout).toString();
        let err = fs.readFileSync(stderr).toString();
        super([out, err].join('\n'));
        this.type = 'CompileError';
        this.stdout = out;
        this.stderr = err;
    }
}
class FormatError extends Error {
    constructor(message) {
        super(message);
        this.type = 'FormatError';
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
