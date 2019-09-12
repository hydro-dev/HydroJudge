function log() {
    console.log(arguments);
}
function error() {
    console.error(arguments);
}
function warn() {
    console.warn(arguments);
}
function info() {
    console.info(arguments);
}
module.exports = {
    log, error, warn, info
};
