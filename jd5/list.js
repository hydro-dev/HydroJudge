module.exports = class LIST {
    constructor(tasks) {
        this.tasks = tasks;
    }
    async run(ctx = {}) {
        for (let task of this.tasks) {
            let t = task.task(ctx);
            if (t instanceof LIST) await t.run(ctx);
            else if (t instanceof Promise) await t;
        }
    }
};