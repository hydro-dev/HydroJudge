const fs = require('fs');
class CompileError extends Error {
    constructor({ stdout, stderr } = {}) {
        super('Compile Error');
        if (stdout && stdout[0] == '/' && fs.existsSync(stdout))
            stdout = fs.readFileSync(stdout).toString();
        else stdout = stdout || '';
        if (stderr && stderr[0] == '/' && fs.existsSync(stderr))
            stderr = fs.readFileSync(stderr).toString();
        else stderr = stderr || '';
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
