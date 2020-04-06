class CompileError extends Error {
    constructor({ stdout, stderr, compiler_text } = {}) {
        super('Compile Error');
        if (this.compiler_text) {
            this.stdout = compiler_text;
            this.stderr = '';
        } else {
            this.stdout = stdout || '';
            this.stderr = stderr || '';
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
class TooFrequentError extends Error {
    constructor(message) {
        super(message);
        this.type = 'TooFrequentError';
    }
}

module.exports = {
    CompileError,
    FormatError,
    RuntimeError,
    SystemError,
    TooFrequentError
};
