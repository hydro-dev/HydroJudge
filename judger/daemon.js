
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
global.onDestory = [];
require('./updater');
const
    Session = require('./hosts/index'),
    { sleep, Queue } = require('./utils'),
    log = require('./log'),
    fsp = require('fs').promises,
    yaml = require('js-yaml'),
    { RETRY_DELAY_SEC, CONFIG_FILE } = require('./config');

const terminate = async () => {
    log.log('正在保存数据');
    try {
        for (let f of global.onDestory) {
            let r = f();
            if (r instanceof Promise) await r;
        }
        process.exit(1);
    } catch (e) {
        if (global.SI) process.exit(1);
        log.error(e);
        log.error('发生了错误。');
        log.error('再次按下 Ctrl-C 可强制退出。');
        global.SI = true;
    }
};
process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
process.stdin.setEncoding('utf8');
process.stdin.on('data', async input => {
    let i = input.toString().trim();
    if (i == 'stop') terminate();
    else {
        i = eval(i);
        if (i instanceof Promise) i = await i;
        console.log(i);
    }
});
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

async function daemon(_CONFIG_FILE) {
    let FILE = _CONFIG_FILE || CONFIG_FILE;
    let config = await fsp.readFile(FILE);
    try {
        config = yaml.safeLoad(config.toString());
    } catch (e) {
        log.error('配置文件无效。');
        process.exit(1);
    }
    let hosts = {};
    let queue = new Queue();
    for (let i in config.hosts) {
        config.hosts[i].host = i;
        hosts[i] = new Session[config.hosts[i].type || 'vj4'](config.hosts[i]);
        await hosts[i].init();
    }
    global.hosts = hosts;
    global.onDestory.push(async () => {
        let config = { hosts: {} };
        for (let i in hosts) {
            config.hosts[i] = {
                host: i,
                type: hosts[i].config.type || 'vj4',
                uname: hosts[i].config.uname,
                password: hosts[i].config.password,
                server_url: hosts[i].config.server_url
            };
            if (hosts[i].config.cookie) config.hosts[i].cookie = hosts[i].config.cookie;
            if (hosts[i].config.detail) config.hosts[i].detail = hosts[i].config.detail;
        }
        await fsp.writeFile(FILE, yaml.safeDump(config));
    });
    while ('Orz twd2')  //eslint-disable-line no-constant-condition
        try {
            for (let i in hosts) await hosts[i].consume(queue);
            while ('Orz iceb0y') { //eslint-disable-line no-constant-condition
                let [task] = await queue.get();
                task.handle();
            }
        } catch (e) {
            log.error(e, e.stack);
            log.info(`在 ${RETRY_DELAY_SEC} 秒后重试`);
            await sleep(RETRY_DELAY_SEC * 1000);
        }
}
if (!module.parent) daemon();
module.exports = daemon;