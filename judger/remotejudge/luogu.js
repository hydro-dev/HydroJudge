const axios = require('axios');
async function login(username, password) {
    let res = await axios.post('https://luogu.com.cn/OAuth2/accessToken', {
        grant_type: 'password',
        client_id, client_secret,
        username, password
    });
    let token = JSON.parse(res.data.data.toString());
    return token;
}
async function refreshToken(token) {
    let res = await axios.post('https://luogu.com.cn/OAuth2/authorize', { 'refresh_token': token.refresh_token });
    token = JSON.parse(JSON.stringify(res.data.data));
    return token;
}
/*
  export enum ProblemState {
    'Waiting' = 0,
    'Judging' = 1,
    'Compile Error' = 2,
    'OLE' = 3,
    'MLE' = 4,
    'TLE' = 5,
    'WA' = 6,
    'RE' = 7,
    'Accepted' = 12,
    'Unaccepted' = 14,
    'Hack Success' = 21,
    'Hack Failure' = 22,
    'Hack Skipped' = 23
  }
  */
async function submitSolution(id, code, lang = 0, enableO2 = false, username, password) {
    await login(username, password);
    let t = token.access_token;
    let Authorization = 'Bearer ' + t;
    let rid = 0;
    let res = await axios.post('https://luogu.com.cn/problem/submit/' + id, {
        code, lang, enableO2,
        verify: ''
    }, { headers: { Authorization } });
    return JSON.parse(res.data.data.toString()).rid;
}
setInterval(refreshToken, 600000);