module.exports = {
    langs: {
        type: 'text',
        default: JSON.stringify(require('./__langs.json')),
        description: 'Language file settings',
    },
};
