const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

exports.prebuild = async function prebuild() {
    let lang = fs.readFileSync(path.resolve(__dirname, '../examples/langs.yaml')).toString();
    lang = yaml.safeLoad(lang);
    fs.writeFileSync(path.resolve(__dirname, '__langs.json'), JSON.stringify(lang));
};
