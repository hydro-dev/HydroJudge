
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
        config.hosts[i].count = config.hosts[i].count || 1;
        config.hosts[i].cookie = config.hosts[i].cookie || [];
        hosts[i] = [];
        for (let j = 0; j < config.hosts[i].count; j++) {
            hosts[i][j] = new VJ4Session({
                host: i, id: j,
                cookie: config.hosts[i].cookie[j] || '',
                uname: config.hosts[i].uname,
                password: config.hosts[i].password,
                last_update_at: config.hosts[i].last_update_at || 0,
                server_url: config.hosts[i].server_url,
                detail: config.hosts[i].detail || true
            });
            await hosts[i][j].init();
            setInterval(() => { hosts[i][j].axios.get('judge/noop'); }, 30000000);
        }
    }
    global.onDestory.push(async () => {
        let config = { hosts: {} };
        for (let i in hosts) {
            config.hosts[i] = {
                host: i,
                cookie: [],
                uname: hosts[i][0].config.uname,
                password: hosts[i][0].config.password,
                last_update_at: hosts[i][0].config.last_update_at,
                server_url: hosts[i][0].config.server_url,
                detail: hosts[i][0].config.detail
            };
            for (let j in hosts[i])
                config.hosts[i].cookie.push(hosts[i][j].config.cookie);
        }
        await fsp.writeFile(_CONFIG_FILE, yaml.safeDump(config));
    });
    await Promise.all([pool.create(SANDBOX_POOL_COUNT || 2)]);
    while ('Orz twd2') {  //eslint-disable-line no-constant-condition
        try {
            for (let i in hosts)
                for (let j in hosts[i]) {
                    await hosts[i][j].ensureLogin();
                    await hosts[i][j].updateProblemData();
                    await hosts[i][j].consume(queue);
                }
            while ('Orz iceb0y') { //eslint-disable-line no-constant-condition
                let request = await queue.get();
                new JudgeHandler(hosts[request.host][request.id], request, request.ws, pool).handle();
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
