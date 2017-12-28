const util = require('../query-utils.js');
const core = require('../core.js');
const args = require('../support/vod-arguments.js');
const config = require('../config');
const log4js = require('log4js');
const ovp = require('../support/ovp');

log4js.configure(config.log);
const log = log4js.getLogger('out');


function aggregationProcessed(size = 10) {
    return {
        'vods': {
            'terms': {
                size,
                'field': 'vodId',
                'order': [{'views': 'desc'}]
            },
            'aggs': {
                'views': {
                    'sum': {
                        'field': 'views'
                    }
                }
            }
        }
    };
}

/**
 * Create the query that that defines what to include.
 *
 * Currently the following dynamic aspects are supported: sitegroup, site, vod and category. The result
 * is the intersection for the comprising attributes. This means that the attributes are concatenated by
 * a logical AND.
 * @param  {Object} instance     instance as a struct
 * @param  {Array|Struct} exclude_expr array of excluding expression. Any struct is treated as a singleton
 * @return {Object}              the query part of the elasticsearch request
 */
function query(ctx, exclude_expr) {
    const
        siteGroupId = ovp.getSiteGroupId(ctx),
        siteId = ovp.getSites(ctx),
        vodId = ctx.query.id,
        category = ctx.query.category;

    const parsedInterval = args.parse(ctx.query, false);

    console.log(parsedInterval)

    return util.filter(
        [
            util.includingSiteGroups(siteGroupId),
            util.includingSites(siteId),
            util.includeVods(vodId),
            util.createdBetween(parsedInterval.start, parsedInterval.end),
            util.includeCategories(category)
        ],
        exclude_expr);
}


module.exports.show = async ctx => {
    log.info("views.show()");

    const client = core(undefined, config, log), q = query(ctx),
        processedQuery = {
            size: 0,
            query: q,
            aggs: aggregationProcessed(ctx.query.size)
        };

    function runQuery() {
        return new Promise(function (resolve, reject) {
            client.query(processedQuery, 'View,Display', 'p_vod_complete,u_vod_complete', 0).then(function (r) {
                const buckets = r.aggregations.vods.buckets.reduce(function (agg, val) {
                    agg[val.key] = val.views.value;

                    return agg;
                }, {});
                resolve(buckets);
            }).catch(function (err) {
                log.error(err);
                log.error(err.stack);
                reject(err);
            });
        });
    }

    ctx.body = await runQuery();
};
