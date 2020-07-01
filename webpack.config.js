const config = {
    mode: 'production',
    entry: {
        judge: './judge/daemon.js',
        entrypoint: './judge/entrypoint.js',
    },
    output: {
        filename: '[name].js',
        path: `${__dirname}/dist`,
    },
    target: 'node',
    module: {},
};

module.exports = config;
