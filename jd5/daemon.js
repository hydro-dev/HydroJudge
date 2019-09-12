
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

async function daemon() {
    let session = new VJ4Session();
    let sandbox = new SandBox('jd5');
    await Promise.all([session.init(), sandbox.init()]);
    setInterval(() => { session.axios.get('judge/noop'); }, 30000000);
    while ('Orz twd2') {  //eslint-disable-line no-constant-condition
        try {
            await session.ensureLogin();
            await session.update_problem_data();
            await session.judge_consume(JudgeHandler, sandbox);
        } catch (e) {
            log.error(e);
            log.info('Retrying after %d seconds', RETRY_DELAY_SEC);
            await sleep(RETRY_DELAY_SEC * 1000);
        }
    }
}
daemon();
