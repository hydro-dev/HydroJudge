function warp(func) {
    return function (a, b, c, d) {
        let dt = (new Date()).toString();
        if (d) func(`${dt} ${a}`, b, c, d);
        else if (c) func(`${dt} ${a}`, b, c);
        else if (b) func(`${dt} ${a}`, b);
        else if (a) {
            if (typeof a == 'string' || a instanceof String) func(`${dt} ${a}`);
            else func(dt, a);
        }
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