function warp(func) {
    return function () {
        let dt = (new Date()).toString();
        func(dt, ...arguments);
    };
}

module.exports = {
    log: warp(console.log),
    error: warp(console.error),
    info: warp(console.info),
    warn: warp(console.warn),
    debug: warp(console.debug),
    submission(id, payload = {}) {
        console.log(`${new Date()} ${id}`, payload);
    }
};