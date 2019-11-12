
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
require('./i18n');
const
    VJ4Session = require('./api'),
    { sleep, Queue } = require('./utils'),
    JudgeHandler = require('./judge'),
    log = require('./log'),
    fsp = require('fs').promises,
    Pool = require('./pool'),
    path = require('path'),
    yaml = require('js-yaml'),
    { RETRY_DELAY_SEC, SANDBOX_POOL_COUNT, CONFIG_DIR } = require('./config'),
    _CONFIG_FILE = path.resolve(CONFIG_DIR, 'config.yaml');

global.onDestory = [];
process.on('SIGINT', async () => {
    log.log('Saving data');
    try {
        for (let f of global.onDestory) {
            let r = f();
            if (r instanceof Promise) await r;
        }
    } catch (e) {
        if (global.SI) process.exit(0);
        log.error(e);
        log.error('An error occured when destorying the sandbox.');
        log.error('Press Ctrl-C again for force exit.');
        global.SI = true;
    }
    process.exit(0);
});

async function daemon() {
    let config = await fsp.readFile(_CONFIG_FILE).catch(() => {
        log.error(`Config file not found at ${_CONFIG_FILE}`);
        process.exit(1);
    });
    let hosts = {};
    try {
        config = yaml.safeLoad(config.toString());
    } catch (e) {
        log.error('Invalid config file.');
        process.exit(1);
    }
    let queue = new Queue();
    for (let i in config.hosts) {
        hosts[i] = new VJ4Session(Object.assign({ host: i }, config.hosts[i]));
        await hosts[i].init();
        setInterval(() => { hosts[i].axios.get('judge/noop'); }, 30000000);
    }
    global.onDestory.push(async () => {
        for (let i in hosts)
            config.hosts[i] = hosts[i].config;
        await fsp.writeFile(_CONFIG_FILE, yaml.safeDump(config));
    });
    let pool = new Pool();
    await Promise.all([pool.create(SANDBOX_POOL_COUNT || 2)]);
    while ('Orz twd2') {  //eslint-disable-line no-constant-condition
        try {
            for (let i in hosts) {
                await hosts[i].ensureLogin();
                await hosts[i].updateProblemData();
                await hosts[i].consume(queue);
            }
            while ('Orz iceb0y') { //eslint-disable-line no-constant-condition
                let request = await queue.get();
                await new JudgeHandler(hosts[request.host], request, request.ws, pool).handle();
            }
        } catch (e) {
            log.error(e);
            log.info('Retrying after %d seconds', RETRY_DELAY_SEC);
            await sleep(RETRY_DELAY_SEC * 1000);
        }
    }
}
daemon();
process.stdin.setEncoding('utf8');
process.stdin.on('data', async input => {
    try {
        let t = eval(input.toString().trim());
        if (t instanceof Promise) console.log(await t);
        else console.log(t);
    } catch (e) {
        console.warn(e);
    }
});