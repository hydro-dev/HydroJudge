const
    path = require('path'),
    fs = require('fs'),
    { mkdirp, rmdir } = require('./utils'),
    { CACHE_DIR } = require('./config');
module.exports = {
    async open(session, host, domain_id, pid) {
        let domain_dir = path.join(CACHE_DIR, host, domain_id);
        let file_path = path.join(domain_dir, pid);
        if (fs.existsSync(file_path)) {
            let v, ver;
            try {
                v = await session.problem_data_version(domain_id, pid);
                ver = fs.readFileSync(path.join(file_path, 'version')).toString();
            } catch (e) { /* ignore */ }
            if (v == ver) return file_path;
            else rmdir(file_path);
        }
        mkdirp(domain_dir);
        let version = await session.problem_data(domain_id, pid, file_path);
        fs.writeFileSync(path.join(file_path, 'version'), version);
        return file_path;
    },
};