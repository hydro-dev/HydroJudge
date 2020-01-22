const
    { STATUS_JUDGING } = require('../status'),
    { check } = require('../check');

exports.judge = async function ({ next, end, config, pool, code }) {
    let [judge_sandbox] = await pool.get();
    try {
        next({ status: STATUS_JUDGING, progress: 0 });
        let [status, score, message] = await check(judge_sandbox, {
            stdout: config.answer,
            user_stdout: code,
            checker_type: 'default',
            score: 100,
            detail: config.detail
        });
        next({
            status, progress: 100,
            case: { status, score, time_ms: 0, memory_kb: 0, judge_text: message }
        });
        end({ status, score, time_ms: 0, memory_kb: 0 });
    } finally {
        await judge_sandbox.free();
    }
};
