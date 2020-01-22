module.exports = {
    log: console.log,
    error: console.error,
    info: console.info,
    warn: console.warn,
    debug: console.debug,
    submission(id, payload = {}) {
        console.log(id, payload);
    }
};