const
    SandBox = require('./sandbox'),
    { Queue } = require('./utils');
module.exports = class pool {
    constructor() {
        this.free = new Queue();
        this.pool = [];
    }
    async create(count) {
        for (let i = 0; i < count; i++) {
            let sandbox = new SandBox(i);
            await sandbox.init();
            sandbox.on('free', () => {
                this.free.push(sandbox);
            });
            await sandbox.free();
            this.pool.push(sandbox);
        }
    }
    get(count) {
        return this.free.get(count);
    }
};
