const prog = require('cli-progress');
let current = {};
if (process.stdin.isTTY){
    const screen = new prog.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: '{id} [{bar}] {percentage}% | {value}/{total}'
    }, prog.Presets.legacy);
    module.exports = {
        log: console.log,
        error: console.error,
        info: console.info,
        warn: console.warn,
        debug: console.debug,
        ACTION_CREATE: 1,
        ACTION_UPDATE: 2,
        ACTION_FINISH: 3,
        ACTION_INCREASE: 4,
        submission(id, action, payload = {}) {
            payload.id = id;
            if (action == this.ACTION_CREATE) {
                current[id] = screen.create(100, 0, payload);
            } else if (action == this.ACTION_UPDATE) {
                if (payload.total) current[id].setTotal(payload.total);
                if (!payload.progress) payload.progress = null;
                current[id].update(payload.progress, payload);
            } else if (action == this.ACTION_FINISH) {
                screen.remove(current[id]);
            } else if (action==this.ACTION_INCREASE){
                current[id].increment();
            }
        }
    };
}else{
    module.exports = {
        log: console.log,
        error: console.error,
        info: console.info,
        warn: console.warn,
        debug: console.debug,
        ACTION_CREATE: 1,
        ACTION_UPDATE: 2,
        ACTION_FINISH: 3,
        ACTION_INCREASE: 4,
        submission(id, action, payload = {}) {
            payload.id = id;
            if (action == this.ACTION_CREATE) {
                console.log(id);
            }
        }
    };
}
