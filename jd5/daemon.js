
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
    { SandBox } = require('jd5-sandbox'),
    JudgeHandler = require('./judge'),
    RETRY_DELAY_SEC = 30;

async function daemon() {
    let session = new VJ4Session();
    let sandbox = new SandBox('jd5');
    await Promise.all([session.init(), sandbox.init()]);
    setInterval(() => { session.axios.get('judge/noop'); }, 30000000);
    while (true) {  //eslint-disable-line no-constant-condition
        try {
            await session.ensureLogin();
            await session.update_problem_data();
            await session.judge_consume(JudgeHandler, sandbox);
        } catch (e) {
            console.error(e);
            console.info('Retrying after %d seconds', RETRY_DELAY_SEC);
            await sleep(RETRY_DELAY_SEC * 1000);
        }
    }
}
daemon();
