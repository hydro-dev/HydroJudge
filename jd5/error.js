class CompileError extends Error {
    constructor(message) {
        super(message);
        this.type = 'CompileError';
    }
}
class FormatError extends Error {
    constructor(message) {
        super(message);
        this.type = 'FormatError';
    }
}

module.exports = {
    CompileError,
    FormatError
};
