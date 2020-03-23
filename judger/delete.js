const
    { EXECUTION_HOST } = require('./config'),
    Axios = require('axios');

const axios = Axios.create({ baseURL: EXECUTION_HOST });

module.exports = async function (fileId) {
    let res = await axios.delete(`/file/${fileId}`);
    return res.data;
};
