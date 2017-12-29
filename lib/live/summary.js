const util = require('../query-utils.js');
const core = require('../core.js');

const config = require('../config');
const log4js = require('log4js');
const ovp = require('../support/ovp');
const parameterValidator = require('../middleware/validator').params;

log4js.configure(config.log);
const log = log4js.getLogger('out');

function processedAggregation() {
    return util.nestedAggregagtion('nested_aspects', 'aspects',
        util.aggregateByField('aspects', 'aspects.key',
            util.aggregateBySum('sums', 'aspects.value')));
}

function unprocessedAggregation() {
    return util.aggregateByField('types', '_type');
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
function query(instance, exclude_expr) {
    const siteGroupId = ovp.getSiteGroupId(instance._ctx),
        siteId = ovp.getSites(instance._ctx),
        liveId = instance._params.id,
        category = instance._params.category,
        start = instance._params.start,
        end = instance._params.end;

    const q = util.filter(
        [
            util.includingSiteGroups(siteGroupId),
            util.includingSites(siteId),
            util.includeLiveIds(liveId),
            util.createdBetween(start, end),
            util.includeCategories(category)
        ],
        exclude_expr);

    return q;
}

function extractDisplayAndViewsProcessed(response) {
    const buckets = response.aggregations.nested_aspects.aspects.buckets;

    return buckets.reduce(function (agg, val) {
        if (val.key === 'display') {
            agg.displays = val.sums.value;
        }

        if (val.key === 'view') {
            agg.views = val.sums.value;
        }

        return agg;
    }, {views: 0, displays: 0});
}

function extractDisplayAndViewsUnprocessed(response) {
    const buckets = response.aggregations.types.buckets;

    return buckets.reduce(function (agg, val) {
        if (val.key === 'Display') {
            agg.displays = val.doc_count;
        }

        if (val.key === 'View') {
            agg.views = val.doc_count;
        }

        return agg;
    }, {views: 0, displays: 0});
}

class LiveSiteStat {
    constructor(ctx, search) {
        this._ctx = ctx;
        this._params = ctx.query;
        this._search = search;
    }

    searchProcessed() {
        const q = {
            query: query(this),
            aggs: processedAggregation(this)
        };

        log.debug('POST p_live/Display', JSON.stringify(q));

        return this._search(q, 'Display', 'p_live', 0);
    }

    searchUnprocessed() {
        const q = {
            query: query(this, {match: {processed: true}}),
            aggs: unprocessedAggregation(this)
        };

        log.debug('POST u_live', JSON.stringify(q));

        return this._search(q, null, 'u_live', 0);
    }
}

module.exports.validateShow = parameterValidator(Joi => {
    return Joi.object().keys({
        id: Joi.string().allow(null, ''),
        siteId: Joi.string().allow(null, ''),
        start: Joi.date().format(['YYYY-MM-DDTHH', 'YYYY-MM-DD']).allow("", null),
        end: Joi.date().format(['YYYY-MM-DDTHH', 'YYYY-MM-DD']).allow("", null),
        category: Joi.string().allow(null, '')
    })
});

module.exports.show = async ctx => {
    const client = core(undefined, config, log),
        instance = new LiveSiteStat(ctx, client.query);

    function runQuery() {
        return Promise.all([
            instance.searchProcessed(),
            instance.searchUnprocessed()
        ]);
    }

    try {
        const [processed, unprocessed] = await runQuery();
        const sumOfProcessed = extractDisplayAndViewsProcessed(processed),
            sumOfUnprocessed = extractDisplayAndViewsUnprocessed(unprocessed);

        ctx.body = {
            views: sumOfProcessed.views + sumOfUnprocessed.views,
            displays: sumOfProcessed.displays + sumOfUnprocessed.displays
        };
    } catch (e) {
        log.error(e.message);
        log.error(e.stack);
        throw e;
    }
};
