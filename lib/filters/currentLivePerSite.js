const util = require('../query-utils.js');

/**
 * Instead of using a json version, the query can be programmatically defined
 */

function query(params) {
    params = params || {};

    return {
        size: 0,
        query: util.filter([
            util.createdBetween('now-1m'),
            util.includingSites(params.sites),
            util.includeSiteGroupId(params.sitegroup)
        ]),
        aggs: util.aggregateBySite(util.aggregatedByLiveId())
    };
}

function base(payload) {
    return payload.bySites.buckets.reduce(function (a, e) {
        a[e.key] = {
            count: e.doc_count,
            streams: e.byLiveId.buckets.reduce(function (a2, e2) {
                a2[e2.key] = e2.doc_count;
                return a2;
            }, {})
        };

        return a;
    }, {});
}

module.exports = {
    base,
    query
};
