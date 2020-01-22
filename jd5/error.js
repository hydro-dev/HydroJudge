class CompileError extends Error {
    constructor({ stdout, stderr } = {}) {
        super('Compile Error');
        this.stdout = stdout || '/dev/null';
        this.stderr = stderr || '/dev/null';
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
