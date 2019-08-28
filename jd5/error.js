class CompileError extends Error {
    constructor(message) {
        super(message);
        this.type = 'CompileError';
    }
}

module.exports = {
    CompileError
};
