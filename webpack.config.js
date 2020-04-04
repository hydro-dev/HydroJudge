const config = {
    mode: 'production',
    entry: {
        judger: './judger/daemon.js',
        entrypoint: './judger/entrypoint.js'
    },
    output: {
        filename: '[name].js',
        path: __dirname + '/dist'
    },
    target: 'node',
    module: {}
};

module.exports = config;