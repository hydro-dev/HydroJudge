const webpack = require('webpack');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');

const config = {
    mode: 'production',
    entry: {
        judge: './judge/daemon.js',
        entrypoint: './judge/entrypoint.js',
        service: './service.js',
    },
    output: {
        filename: '[name].js',
        path: `${__dirname}/dist`,
    },
    target: 'node',
    module: {},
    plugins: [
        new webpack.ProgressPlugin(),
        new FriendlyErrorsWebpackPlugin(),
    ],
};

module.exports = config;
