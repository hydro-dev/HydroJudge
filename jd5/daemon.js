
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
    JudgeHandler = require('./judge'),
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
        config.hosts[i].cookie = config.hosts[i].cookie || '';
        hosts[i] = new Session[config.hosts[i].type || 'vj4']({
            host: i,
            cookie: config.hosts[i].cookie || '',
            uname: config.hosts[i].uname,
            password: config.hosts[i].password,
            last_update_at: config.hosts[i].last_update_at || 0,
            server_url: config.hosts[i].server_url,
            detail: config.hosts[i].detail || true
        });
        await hosts[i].init();
        setInterval(() => { hosts[i].axios.get('judge/noop'); }, 30000000);
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
            for (let i in hosts) {
                await hosts[i].ensureLogin();
                await hosts[i].consume(queue);
            }
            while ('Orz iceb0y') { //eslint-disable-line no-constant-condition
                let [request] = await queue.get();
                new JudgeHandler(hosts[request.host], request, request.ws, pool).handle();
            }
        } catch (e) {
            log.error(e);
            log.info('Retrying after %d seconds', RETRY_DELAY_SEC);
            await sleep(RETRY_DELAY_SEC * 1000);
        }
    }
}
if (!module.parent) daemon();
module.exports = daemon;