const
    axios = require('axios'),
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    WebSocket = require('ws'),
    { SystemError } = require('../error'),
    RE_CSRF = /<meta name="X-Csrf-Token" content="(.*?)"\/>/i,
    LANG = {
        'GNU GCC C11 5.1.0': 43,
        'c': 43,
        'Clang++17 Diagnostics': 52,
        'GNU G++11 5.1.0': 42,
        'cc': 42,
        'GNU G++14 6.4.0': 50,
        'GNU G++17 7.3.0': 54,
        'Microsoft Visual C++ 2010': 2,
        'Microsoft Visual C++ 2017': 59,
        'c#': 9,
        'C# Mono 5.18': 9,
        'D DMD32 v2.086.0': 28,
        'go': 32,
        'Go 1.12.6': 32,
        'hs': 12,
        'Haskell GHC 8.6.3': 12,
        'java': 60,
        'Java 11.0.5': 60,
        'Java 1.8.0_162': 36,
        'Kotlin 1.3.10': 48,
        'OCaml 4.02.1': 19,
        'Delphi 7': 3,
        'pas': 4,
        'Free Pascal 3.0.2': 4,
        'PascalABC.NET 3.4.2': 51,
        'Perl 5.20.1': 13,
        'php': 6,
        'PHP 7.2.13': 6,
        'py': 7,
        'py2': 7,
        'Python 2.7.15': 7,
        'py3': 31,
        'Python 3.7.2': 31,
        'PyPy 2.7 (7.2.0)': 40,
        'PyPy 3.6 (7.2.0)': 41,
        'rb': 8,
        'Ruby 2.0.0p645': 8,
        'rs': 49,
        'Rust 1.35.0': 49,
        'Scala 2.12.8': 20,
        'js': 34,
        'JavaScript V8 4.8.0': 34,
        'Node.js 9.4.0': 55,
        'ActiveTcl 8.5': 14,
        'Io-2008-01-07 (Win32)': 15,
        'Pike 7.8': 17,
        'Befunge': 18,
        'OpenCobol 1.0': 22,
        'Factor': 25,
        'Secret_171': 26,
        'Roco': 27,
        'Ada GNAT 4': 33,
        'Mysterious Language': 38,
        'FALSE': 39,
        'Picat 0.9': 44,
        'GNU C++11 5 ZIP': 45,
        'Java 8 ZIP': 46,
        'J': 47,
        'Microsoft Q#': 56,
        'Text': 57
    },
    randomNumber = () => Math.random().toString(36).substr(2),
    safeRandomBytes = (length) => {
        while (true) {
            try {
                return crypto.randomBytes(length);
            } catch (e) {
                continue;
            }
        }
    },
    randomstr = length => {
        let chars = '0123456789abcdef', string = '';
        let maxByte = 256 - (256 % chars.length);
        while (length > 0) {
            let buf = safeRandomBytes(Math.ceil(length * 256 / maxByte));
            for (let i = 0; i < buf.length && length > 0; i++) {
                let randomByte = buf.readUInt8(i);
                if (randomByte < maxByte) {
                    string += chars.charAt(randomByte % chars.length);
                    length--;
                }
            }
        }
        return string;
    },
    _ftaa = () => (randomNumber() + randomNumber()).substring(0, 18),
    _bfaa = () => randomstr(32);

let fp;
try {
    fp = require('../.local/codeforces.json');
} catch (e) {
    fp = { ftaa: _ftaa(), bfaa: _bfaa() };
    fs.writeFileSync(path.resolve(__dirname, '..', '.local', 'codeforces.json'), JSON.stringify(fp));
}

module.exports = class CodeForces {
    constructor(server_url) {
        this.server_url = server_url.split('/', 3).join('/');
    }
    async loginWithToken(cookie) {
        this.cookie = cookie;
        this.axios = axios.create({
            baseURL: this.server_url,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'cookie': this.cookie
            },
            transformRequest: [
                function (data) {
                    let ret = '';
                    for (let it in data)
                        ret += encodeURIComponent(it) + '=' + encodeURIComponent(data[it]) + '&';
                    return ret;
                }
            ]
        });
    }
    async login(username, password) {
        console.log(fp);
        await this.loginWithToken('');
        console.log(1);
        let enter_get = await this.axios.get('/enter');
        await this.loginWithToken(enter_get.headers['set-cookie']);
        console.log(2);
        let csrf_token = RE_CSRF.exec(enter_get.data)[1];
        console.log(csrf_token);
        await this.axios.post('/data/empty', { ftaa: fp.ftaa, bfaa: null });
        console.log(3);
        let res = await this.axios.post('/enter', {
            handlerOrEmail: username, password, csrf_token, action: 'enter', ftaa: fp.ftaa, bfaa: fp.bfaa
        });
        console.log(res.headers);
        await this.loginWithToken(enter_get.headers['set-cookie']);
    }
    async judge(pid, source, lang, next, end) {
        let res = await this.axios.get('/problemset/submit');
        let csrf_token = RE_CSRF.exec(res.data)[1];
        let resp = await this.axios.post(`/problemset/submit/?csrf_token=${csrf_token}`, {
            csrf_token, ftaa: fp.ftaa, bfaa: fp.bfaa, action: 'submitSolutionFormSubmitted',
            submittedProblemCode: pid, programTypeId: LANG[lang], source, tabSize: 4,
            _tta: 640
        });
        console.log(resp);
    }
};
