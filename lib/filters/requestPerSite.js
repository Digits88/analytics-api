const util = require('../query-utils.js');

/**
 * Instead of using a json version, the query can be programmatically defined
 */

function query(params) {
    return {
        size: 0,
        query: util.filter([
            util.createdBetween(params.starts, params.ends),
            {range: {loadTimeMs: {gt: 0}}},
            util.includingSites(params.sites)
        ]),
        aggs: util.aggregatedByTime(util.aggregateBySite(), params.interval)
    };
}

function base(payload) {
    let resp = payload.byTime.buckets.map(function (bucket) {
        return bucket.bySites.buckets.reduce(function (a, v) {
            a[v.key] = v.doc_count;
            return a;
        }, {
            t: bucket.key,
            c: bucket.doc_count
        });
    });

    return resp;

}

module.exports = {
    base,
    query
};
