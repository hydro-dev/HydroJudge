function warp(func) {
    return (...args) => {
        const dt = (new Date()).toString();
        func(dt, ...args);
    };
}

class Logger {
    constructor() {
        this.log = warp(console.log, 'log');
        this.error = warp(console.error, 'error');
        this.info = warp(console.info, 'info');
        this.warn = warp(console.warn, 'warn');
        this.debug = warp(console.debug, 'debug');
        this.submission = (id, payload = {}) => {
            console.log(`${new Date()} ${id}`, payload);
        };
    }

    logger(logger) {
        this.log = warp(logger.log, 'log');
        this.error = warp(logger.error, 'error');
        this.info = warp(logger.info, 'info');
        this.warn = warp(logger.warn, 'warn');
        this.debug = warp(logger.debug, 'debug');
        this.submission = (id, payload = {}) => {
            logger.log(`${new Date()} ${id}`, payload);
        };
    }
}

module.exports = new Logger();
