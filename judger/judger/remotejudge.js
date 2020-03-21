const
    api = require('../remotejudge'),
    RE_USERNAME = /<j:username=(.+?)>/i,
    RE_PASSWORD = /<j:password=(.+?)>/i,
    RE_LANGUAGE = /<j:language=(.+?)>/i,
    RE_TOKEN = /<j:token=(.+?)>/i,
    { SystemError } = require('../error');
exports.judge = async ctx => {
    let username = ctx.config.username;
    let password = ctx.config.password;
    let token = '';
    if (RE_TOKEN.test(ctx.code)) {
        token = RE_TOKEN.exec(ctx.code)[1];
    } else if (RE_USERNAME.test(ctx.code) && RE_PASSWORD.test(ctx.code)) {
        username = RE_USERNAME.exec(ctx.code)[1];
        password = RE_PASSWORD.exec(ctx.code)[1];
    }
    if ((!(username && password)) && !token) throw new SystemError('No RemoteJudge Account Avilible');
    if (RE_LANGUAGE.test(ctx.code)) ctx.lang = RE_LANGUAGE.exec(ctx.code)[1];
    ctx.next({ judge_text: `Using remote judge: ${ctx.config.server_type} at ${ctx.config.server_url}` });
    let remote = new api[ctx.config.server_type](ctx.config.server_url);
    if (token) await remote.loginWithToken(token);
    else await remote.login(username, password);
    return await remote.judge(ctx.config.pid, ctx.code, ctx.lang, ctx.next, ctx.end);
};
