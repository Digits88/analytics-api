/**
 * Key value with displays and views that is returned by elasticsearch
 * @typedef {Object} VodSiteStatDateRangeViewDisplayBucket
 * @property {string} key - the key for the bucket, this the the lower time bound
 * @property {{value: number}} views - the number of views
 * @property {{value: number}} displays.value - the number of displays
 */

/**
 * Time Range bucket
 * @typedef {Object} VodSiteStatDateRangeBucket
 * @property {number} from - the lower bound for the time range bucket
 * @property {number} to - the upper bound for the time range bucket
 * @property {VodSiteStatDateRangeViewDisplayBucket[]} byTime.buckets - the array of buckets
 */

/**
 * The elasticsearch response for the query
 * @typedef {Object} VodSiteStatResponse
 * @property {VodSiteStatDateRangeBucket[]} aggregations.buckets the array of buckets from the aggregation
 */

/**
 * Simple structure for displays and views
 * @typedef {Object} ViewsDisplays
 * @property {number} views the number of views. Is expected to be non-negative
 * @property {number} displays the number of displays. Is expected to be non-negative
 */

/**
 * Keyed ViewDisplays
 * @typedef {Object} KeyedViewsDisplays
 * @property {number} key the key
 * @property {number} views the number of views. Is expected to be non-negative
 * @property {number} displays the number of displays. Is expected to be non-negative
 */
const config = require('../config');
const log4js = require('log4js');

log4js.configure(config.log);
const log = log4js.getLogger('out');

const util = require('../query-utils.js');
const core = require('../core.js');
const parameterValidator = require('../middleware/validator').params;
const ovp = require('../support/ovp');
const args = require('../support/vod-arguments');

const RANGE = {
    day: ['now-2d/H', 'now-1d/H', 'now/H'],
    week: ['now-13d/d', 'now-6d/d', 'now/m'],
    month: ['now-59d/d', 'now-29d/d', 'now/m']
};

const SUBINTERVAL = {
    day: 'hour',
    week: 'day',
    month: 'day'
};

/**
 * Check that interval is either 'day', 'week' or 'month'. The string match is case-insensitive
 * @param  {string} str the string to parse
 * @return {string}     type or undefined if the string did not match any of above
 */
function parseInterval(str) {
    if (typeof str !== 'string') {
        return;
    }

    const normalized = str.toLowerCase();

    return (['day', 'week', 'month'].findIndex(val => val === normalized) != -1) && str.toLowerCase();
}

/**
 * Merges values from buckets with time serie
 * @param  {KeyedViewsDisplays} buckets the buckets to merge
 * @param  {number[]} serie   the time serie to merge with
 * @return {{moments: number[], displays: number[], views: number[], total: ViewsDisplays}}         the output structure
 */
function mergeViewDisplayBuckets(buckets, serie) {
    const moments = Array.from(serie),
        displays = [],
        views = [],
        struct = buckets.reduce(function (agg, val) {
            agg[val.key] = val;
            return agg;
        }, {}),
        keys = Object.keys(struct).sort();

    let totalDisplays = 0,
        totalViews = 0,
        next;

    for (var i = 0; i < serie.length; i++) {
        //we might get in trouble if serie[i+1] is 0 but since it is not possible
        next = serie[i + 1] || -1;

        let currentViews = 0, currentDisplays = 0;

        while (keys && keys[0] < next) {
            currentViews += struct[keys[0]].views || 0;
            currentDisplays += struct[keys[0]].displays || 0;

            keys.shift();
        }

        if (next === -1) {
            keys.forEach(function (val) {
                currentViews += struct[val].views || 0;
                currentDisplays += struct[val].displays || 0;
            });
        }

        totalViews += currentViews;
        totalDisplays += currentDisplays;

        displays.push(currentDisplays);
        views.push(currentViews);
    }

    const intervals = moments.map(function (moment, index) {
        return {
            time: new Date(moment),
            views: views[index],
            displays: displays[index]
        };
    });

    return {
        intervals,
        total: {
            displays: totalDisplays,
            views: totalViews
        }
    };
}

function aggregation(instance) {
    const sub = Object.assign({},
        util.aggregateBySum('views', 'views'),
        util.aggregateBySum('displays', 'displays'));

    let ranges = [];
    if (instance.range.length == 2) {
        ranges = [instance.range[0], instance.range[1]];
    } else {
        ranges = [instance.range[0], instance.range[1], instance.range[2]];
    }

    if ((new Date().getTime() - instance.range[instance.range.length - 1]) < 86400000) {
        ranges.push('now');
    }
    return util.aggregateByTimeRanges('times', 'created', ranges,
        util.aggregatedByTime(sub, instance.interval, '+00:00'), '+00:00');
}

/**
 * Create the query that that defines what to include.
 *
 * Currently the following dynamic aspects are supported: sitegroup, site, vod and category. The result
 * is the intersection for the comprising attributes. This means that the attributes are concatenated by
 * a logical AND.
 * @param  {Object} instance     instance as a struct
 * @return {Object}              the query part of the elasticsearch request
 */
function query(instance) {
    const siteGroupId = ovp.getSiteGroupId(instance._ctx),
        siteId = ovp.getSites(instance._ctx),
        vodId = instance._params.id,
        category = instance._params.category;

    let endTime = instance.range[instance.range.length - 1];
    if ((new Date().getTime() - instance.range[instance.range.length - 1]) < 86400000) {
        endTime = 'now';
    }
    return util.filter(
        [
            util.includingSiteGroups(siteGroupId),
            util.includingSites(siteId),
            util.includeVods(vodId),
            util.createdBetween(instance.range[0], endTime),
            util.includeCategories(category)
        ]);
}

/**
 * Generates a montonic increasing time serie starting at 'start'
 * @param  {Number} start       the start value (inclusive)
 * @param  {Number} end         the end value (inclusive)
 * @param  {string} subinterval the string that describes the subinterval. It recognize 'hour' and assumes
 *                              otherwise that the interval is 'day'
 * @return {Number[]}             an array of number start at 'start' (inclusive) to 'end' (inclusive) incremented
 *                                corresponding to the subinterval
 */
function generateTimeserie(start, end, subinterval) {
    if (start > end) {
        throw Error('start value must be less than or equal to end value, ' + start + ' ' + end);
    }

    const deltaMs = subinterval === 'hour' ? 3600000 : 86400000, serie = [];

    let current = end;
    while (current > start) {
        serie.push(current);

        current -= deltaMs;
    }

    serie.reverse();

    return serie;
}

/**
 * Flattens values bucket
 * @param  {VodSiteStatDateRangeViewDisplayBucket} bucket the bucket to extract from
 * @return {KeyedViewsDisplays}        the extracted views and dipslays with provided value for key
 */
function flatten(bucket) {
    return {
        key: bucket.key,
        displays: bucket.displays.value,
        views: bucket.views.value
    };
}


/**
 * Extractor for fetching displays and views in a 'safe' manner
 * @param  {VodSiteStatDateRangeViewDisplayBucket | undefined} bucket the bucket
 * @param  {ViewsDisplays} fallback the objects to retrieve fallback values
 * @return {ViewsDisplays}          the extracted values. Missing values are replaced by fallback
 */
function extractFromBucket(bucket, fallback) {
    if (!bucket) {
        return Object.assign({}, fallback);
    }

    const
        displays = bucket.displays && bucket.displays.value,
        views = bucket.views && bucket.views.value;

    return {
        displays: displays || fallback.displays,
        views: views || fallback.views
    };
}

/**
 * Process a single date range bucket
 * @param  {VodSiteStatDateRangeBucket} processed      the bucket to processed
 * @param  {number} delta          the selected interval
 * @param  {boolean} singleInterval whether we are dealing with a single interval
 * @return {Object}                the output format
 */
function processPeriodBucket(processed, delta, singleInterval) {
    if (singleInterval) {
        const extracted = extractFromBucket(processed.byTime.buckets[0], {displays: 0, views: 0});

        const intervals = processed.from.map(function (moment, index) {
            return {
                time: new Date(moment),
                views: extracted.displays[index],
                displays: extracted.displays[index]
            };
        });

        return {
            date_from: new Date(processed.from),
            date_to: new Date(processed.to),
            views: [extracted.views],
            intervals
        };
    }

    const
        serie = generateTimeserie(processed.from, processed.to, delta),
        interval = {
            date_from: new Date(processed.from),
            date_to: new Date(processed.to)
        },
        bytime = processed.byTime.buckets.map(flatten),
        merged = mergeViewDisplayBuckets(bytime, serie);

    return Object.assign(interval, merged);
}

class VodSiteStat {
    constructor(ctx, search) {
        this._ctx = ctx;
        this._params = ctx.query || {};
        this._search = search;
        this.range = RANGE[parseInterval(this._params.interval) || 'day'];
        this.interval = SUBINTERVAL[parseInterval(this._params.interval)] || '1h';

        if (this._params.start && this._params.end) {
            let start = args.parseTimestamp(this._params.start);
            let end = args.parseTimestamp(this._params.end);

            let start_int = start.ts,
                end_int = end.ts,
                time_diff = end_int - start_int,
                time_interval = 86400000; // 24 hours in millis

            if (time_diff <= 86400000) {
                this.interval = 'hour';
                time_interval = 3600000;

            } else {
                this.interval = 'day';
            }

            if (!this._params.previous) {
                let time_diff_mod = time_diff - (time_diff % time_interval) + time_interval;

                this.range = [start.getPreviousTs(time_diff_mod, 'ms'), start_int, end_int];
            } else {
                this.range = [start_int, end_int];
            }
            log.debug("range: " + JSON.stringify(this.range));

        } else {
            this.range = RANGE[parseInterval(this._params.interval) || 'day'];
        }
    }

    search() {
        return this._search({
            query: query(this),
            aggs: aggregation(this)
        }, 'View,Display', 'u_vod_complete,p_vod_complete', 0);
    }
}

module.exports.validateShow = parameterValidator(Joi => {
    return Joi.object().keys({
        id: Joi.string().allow(null, ''),
        siteId: Joi.string().allow(null, ''),
        start: Joi.date().format(['YYYY-MM-DDTHH', 'YYYY-MM-DD']).allow("", null),
        end: Joi.date().format(['YYYY-MM-DDTHH', 'YYYY-MM-DD']).allow("", null),
        previous: Joi.boolean().allow(null, '')
    })
});

module.exports.show = async ctx => {
    log.info("intervals.show(): " + ctx.params.id);
    const client = core(undefined, config, log),
        instance = new VodSiteStat(ctx, client.query);

    function runQuery() {
        return new Promise(function (resolve, reject) {
            instance.search().then(function (response) {
                let ppbs = [];
                if (response.aggregations.times.buckets.length === 1) {
                    ppbs.push(processPeriodBucket(response.aggregations.times.buckets[0], instance.interval, false));
                } else if (response.aggregations.times.buckets.length === 2) {
                    ppbs.push(processPeriodBucket(response.aggregations.times.buckets[0], instance.interval, false));
                    ppbs.push(processPeriodBucket(response.aggregations.times.buckets[1], instance.interval, false));
                } else {
                    ppbs.push(processPeriodBucket(response.aggregations.times.buckets[0], instance.interval, false));
                    ppbs.push(processPeriodBucket(response.aggregations.times.buckets[1], instance.interval, false));
                    ppbs.push(processPeriodBucket(response.aggregations.times.buckets[2], instance.interval, instance.interval === ''));

                }
                resolve(ppbs);
            });
        });
    }

    ctx.body = await runQuery();
};
