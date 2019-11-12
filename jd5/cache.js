const
    fs = require('fs'),
    path = require('path'),
    { rmdir } = require('./utils'),
    { CACHE_DIR } = require('./config'),
    mkdirp = require('mkdirp');

module.exports = {
    async open(session, host, domain_id, pid) {
        let domain_dir = path.join(CACHE_DIR, host, domain_id);
        let file_path = path.join(domain_dir, pid);
        if (fs.existsSync(file_path)) return file_path;
        mkdirp(domain_dir);
        await session.problem_data(domain_id, pid, file_path);
        return file_path;
    },
    async invalidate(host, domain_id, pid) {
        let file_path = path.join(CACHE_DIR, String(host), String(domain_id), String(pid));
        try {
            rmdir(file_path);
        } catch (e) {
            if (e.code != 'ENOENT') throw e;
        }
    }
};
