
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
const
    VJ4Session = require('./api'),
    { sleep } = require('./utils'),
    SandBox = require('./sandbox'),
    JudgeHandler = require('./judge'),
    log = require('./log'),
    { RETRY_DELAY_SEC } = require('./config');

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
    let session = new VJ4Session();
    let sandbox = new SandBox('jd5');
    global.sandbox = sandbox;
    await Promise.all([session.init(), sandbox.init()]);
    await sandbox.reset();
    setInterval(() => { session.axios.get('judge/noop'); }, 30000000);
    while ('Orz twd2') {  //eslint-disable-line no-constant-condition
        try {
            await session.ensureLogin();
            await session.updateProblemData();
            await session.judgeConsume(JudgeHandler, sandbox);
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