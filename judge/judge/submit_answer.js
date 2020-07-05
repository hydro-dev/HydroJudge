const { STATUS_JUDGING } = require('../status');
const { check } = require('../check');

exports.judge = async function judge({
    next, end, config, code,
}) {
    next({ status: STATUS_JUDGING, progress: 0 });
    const [status, score, message] = await check({
        stdout: config.answer,
        user_stdout: code,
        checker_type: 'default',
        score: 100,
        detail: config.detail,
    });
    next({
        status,
        progress: 100,
        case: {
            status, score, time_ms: 0, memory_kb: 0, judge_text: message,
        },
    });
    end({
        status, score, time_ms: 0, memory_kb: 0,
    });
};
