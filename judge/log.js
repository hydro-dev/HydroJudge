function wrap(func) {
    return (...args) => {
        const dt = (new Date()).toString();
        func(dt, ...args);
    };
}

class Logger {
    constructor() {
        this.log = wrap(console.log, 'log');
        this.error = wrap(console.error, 'error');
        this.info = wrap(console.info, 'info');
        this.warn = wrap(console.warn, 'warn');
        this.debug = wrap(console.debug, 'debug');
        this.submission = (id, payload = {}) => {
            console.log(`${new Date()} ${id}`, payload);
        };
    }

    logger(logger) {
        this.log = wrap(logger.log, 'log');
        this.error = wrap(logger.error, 'error');
        this.info = wrap(logger.info, 'info');
        this.warn = wrap(logger.warn, 'warn');
        this.debug = wrap(logger.debug, 'debug');
        this.submission = (id, payload = {}) => {
            logger.log(`${new Date()} ${id}`, payload);
        };
    }
}

module.exports = new Logger();
