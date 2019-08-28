const
    os = require('os'),
    fs = require('fs'),
    path = require('path'),
    { rmdir } = require('./utils'),
    mkdirp = require('mkdirp'),
    _CACHE_DIR = path.resolve(os.homedir(), '.cache', 'jd5');

module.exports = {
    async cache_open(session, domain_id, pid) {
        let domain_dir = path.join(_CACHE_DIR, domain_id);
        let file_path = path.join(domain_dir, pid);
        if (fs.existsSync(file_path)) return file_path;
        mkdirp(domain_dir);
        await session.problem_data(domain_id, pid, file_path);
        return file_path;
    },
    async cache_invalidate(domain_id, pid) {
        let file_path = path.join(_CACHE_DIR, domain_id, pid);
        try {
            rmdir(file_path);
        } catch (e) {
            if (e.code != 'ENOENT') throw e;
        }
    }
};
