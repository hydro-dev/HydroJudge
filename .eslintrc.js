module.exports = {
    root: true,
    env: {
        commonjs: true,
        node: true,
    },
    extends: [
        'airbnb-base',
    ],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    parserOptions: {
        ecmaVersion: 2018,
    },
    rules: {
        indent: ['warn', 4],
        'no-plusplus': 'off',
        'no-underscore-dangle': 'off',
        'no-console': 'off',
        'no-extend-native': 'off',
        'no-restricted-syntax': 'off',
        'max-classes-per-file': 'off',
        radix: 'off',
        'guard-for-in': 'off',
        'no-param-reassign': 'off',
        'global-require': 'off',
        'no-multi-assign': 'off',
        'consistent-return': 'off',
        'no-template-curly-in-string': 'off',
        'no-return-await': 'off',
        'prefer-destructuring': 'off',
        camelcase: 'off',
        'no-shadow': 'off',
    },
};
