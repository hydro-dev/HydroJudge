
/*                        ..
                        .' @`._
         ~       ...._.'  ,__.-;
      _..- - - /`           .-'    ~
     :     __./'       ,  .'-'- .._
  ~   `- -(.-'''- -.    \`._       `.   ~
    _.- '(  .______.'.-' `-.`         `.
   :      `-..____`-.                   ;
   `.             ````  稻花香里说丰年，  ;   ~
     `-.__          听取人生经验。  __.-'
          ````- - -.......- - -'''    ~
       ~                   */
require('./updater');
const
    Session = require('./hosts/index'),
    { sleep, Queue } = require('./utils'),
    log = require('./log'),
    fsp = require('fs').promises,
    Pool = require('./pool'),
    yaml = require('js-yaml'),
    { RETRY_DELAY_SEC, SANDBOX_POOL_COUNT, CONFIG_FILE } = require('./config');

global.onDestory = [];
const terminate = async () => {
    log.log('Saving data');
    try {
        for (let f of global.onDestory) {
            let r = f();
            if (r instanceof Promise) await r;
        }
        process.exit(1);
    } catch (e) {
        if (global.SI) process.exit(1);
        log.error(e);
        log.error('An error occured when destorying the sandbox.');
        log.error('Press Ctrl-C again for force exit.');
        global.SI = true;
    }
};
process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
process.stdin.setEncoding('utf8');
process.stdin.on('data', input => {
    let i = input.toString().trim();
    if (i == 'stop') terminate();
});

async function daemon(_CONFIG_FILE) {
    let FILE = _CONFIG_FILE || CONFIG_FILE;
    let config = await fsp.readFile(FILE);
    try {
        config = yaml.safeLoad(config.toString());
    } catch (e) {
        log.error('Invalid config file.');
        process.exit(1);
    }
    let hosts = {};
    let queue = new Queue();
    let pool = new Pool();
    for (let i in config.hosts) {
        config.hosts[i].host = i;
        hosts[i] = new Session[config.hosts[i].type || 'vj4'](config.hosts[i]);
        await hosts[i].init();
    }
    global.hosts = hosts;
    global.onDestory.push(async () => {
        let config = { hosts: {} };
        for (let i in hosts)
            config.hosts[i] = {
                host: i,
                cookie: hosts[i].config.cookie,
                uname: hosts[i].config.uname,
                password: hosts[i].config.password,
                server_url: hosts[i].config.server_url,
                detail: hosts[i].config.detail
            };
        await fsp.writeFile(FILE, yaml.safeDump(config));
    });
    await Promise.all([pool.create(SANDBOX_POOL_COUNT || 2)]);
    while ('Orz twd2') {  //eslint-disable-line no-constant-condition
        try {
            for (let i in hosts) await hosts[i].consume(queue);
            while ('Orz iceb0y') { //eslint-disable-line no-constant-condition
                let [task] = await queue.get();
                await task.handle(pool);
            }
        } catch (e) {
            log.error(e, e.stack);
            log.info(`Retrying after ${RETRY_DELAY_SEC} seconds`);
            await sleep(RETRY_DELAY_SEC * 1000);
        }
    }
}
if (!module.parent) daemon();
module.exports = daemon;