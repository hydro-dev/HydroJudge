const api = require('../remotejudge');
const { SystemError, TooFrequentError } = require('../error');
const { sleep } = require('../utils');

const RE_USERNAME = /<j:username=(.+?)>/i;
const RE_PASSWORD = /<j:password=(.+?)>/i;
const RE_LANGUAGE = /<j:language=(.+?)>/i;
const RE_TOKEN = /<j:token=(.+?)>/i;

exports.judge = async (ctx) => {
    let user_username;
    let user_password;
    let user_token;
    let data;
    if (RE_TOKEN.test(ctx.code)) {
        user_token = RE_TOKEN.exec(ctx.code)[1];
    } else if (RE_USERNAME.test(ctx.code) && RE_PASSWORD.test(ctx.code)) {
        user_username = RE_USERNAME.exec(ctx.code)[1];
        user_password = RE_PASSWORD.exec(ctx.code)[1];
    }
    ctx.next({ judge_text: `正在使用 RemoteJudge:  ${ctx.config.server_type} ${ctx.config.server_url}` });
    if (RE_LANGUAGE.test(ctx.code)) ctx.lang = RE_LANGUAGE.exec(ctx.code)[1];
    const remote = new api[ctx.config.server_type](ctx.config.server_url);
    if ((user_username && user_password) || user_token) {
        if (user_token) await remote.loginWithToken(user_token);
        else await remote.login(user_username, user_password);
    } else if (ctx.config.username && ctx.config.password) {
        await remote.login(ctx.config.username, ctx.config.password);
    } else throw new SystemError('无用于评测的账号');
    try {
        data = await remote.submit(ctx.config.pid, ctx.code, ctx.lang, ctx.next);
    } catch (e) {
        if (e instanceof TooFrequentError) {
            ctx.next({ judge_text: '远端OJ提交过于频繁, 将在5秒后重试。' });
            await sleep(5);
            data = await remote.submit(ctx.config.pid, ctx.code, ctx.lang, ctx.next);
        } else throw e;
    }
    await remote.monit(data, ctx.next, ctx.end);
};
