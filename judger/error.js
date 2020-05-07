class CompileError extends Error {
    constructor(obj) {
        super('Compile Error');
        if (typeof obj === 'string') {
            this.stdout = obj;
            this.stderr = '';
        } else {
            this.stdout = obj.stdout || '';
            this.stderr = obj.stderr || '';
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
    TooFrequentError,
};
