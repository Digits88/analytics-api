const util = require('../query-utils.js');

function query(params) {
    return {
        size: 0,
        query: util.filter([
            util.createdBetween(params.starts || 'now-1d', params.ends || 'now'),
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
