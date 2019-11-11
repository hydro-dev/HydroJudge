
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
    JudgeHandler = require('./judge'),
    log = require('./log'),
    Pool = require('./pool'),
    { RETRY_DELAY_SEC, SANDBOX_POOL_COUNT } = require('./config');

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
    let pool = new Pool();
    await Promise.all([session.init(), pool.create(SANDBOX_POOL_COUNT || 2)]);
    setInterval(() => { session.axios.get('judge/noop'); }, 30000000);
    while ('Orz twd2') {  //eslint-disable-line no-constant-condition
        try {
            await session.ensureLogin();
            await session.updateProblemData();
            await session.judgeConsume(JudgeHandler, pool);
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