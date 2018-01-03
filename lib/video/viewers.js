/**
 * Returns the (estimated number of views) give a certain duration
 * Required parameters: vodId
 * Optional parameters:
 *
 * duration (the time that is used for calculating) unique
 * current viewers. This should not be too long but should reflect 1% of
 * the total length. The duration is defined in seconds
 *
 * threshold this is optional but is used by elasticsearch to make the
 * query memory efficient. This threshold should reflect some maximum expected
 * number of viewers. Lower value gives better memory efficiency. If not
 * set, the elasticsearch default is used
 *
 * Returns the number of estimated ongoing views
 */

const util = require('../query-utils.js');
const core = require('../core.js');
const config = require('../config');
const log4js = require('log4js');
const parameterValidator = require('../middleware/validator').params;
const args = require('../support/vod-arguments');
const ovp = require('../support/ovp');
const videoDb = require('../db/video');

log4js.configure(config.log);
const log = log4js.getLogger('out');

function query(ctx) {
    const durationMs = parseInt((ctx.query.duration || 60) * 1000) || 60000,
        before = ctx.query.start ? args.parseTimestamp(ctx.query.start).ts : new Date().getTime(),
        after = before - durationMs,
        threshold = ctx.query.threshold ? parseInt(ctx.query.threshold) : undefined;

    return {
        size: 0,
        query: util.filter([util.includeVods(ctx.query.id), util.includingSites(ovp.getSites(ctx)),
            util.includingSiteGroups(ovp.getSiteGroupId(ctx)), util.createdBetween(after, before)]),

        aggs: util.cardinality('unique', 'sessionId.keyword', threshold)
    };
}

module.exports.validateShow = parameterValidator(Joi => {
    return Joi.object().keys({
        id: Joi.allow(null, ''),
        siteId: Joi.string().allow(null, ''),
        start: Joi.date().format(['YYYY-MM-DDTHH', 'YYYY-MM-DD']).allow("", null)
    })
});

module.exports.show = async ctx => {
    log.info("viewers.show(): " + ctx.query.id);

    const client = core(undefined, config, log);
    const q = query(ctx);

    if (ctx.query.id) {
        const videos = await videoDb.get(ovp.getUserId(ctx), ctx.query.id);
        if (videos.length < videoDb.queryLength(ctx.query.id)) {
            let error = new Error("Not found", 404);
            error.status = 404;
            throw error;
        }
    }

    function runQuery() {
        return new Promise(function (resolve, reject) {
            client.query(q, 'Ping', 's_vod_segment').then(function (response) {
                resolve(response.aggregations.unique.value);
            }).catch(function (err) {
                log.error(err);
                log.error(err.stack);
                reject(err);
            });
        });
    }

    const viewers = await runQuery();
    log.info("video_current.show() got result " + viewers);
    ctx.body = {viewers};
};
