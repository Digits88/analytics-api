const util = require('../query-utils.js');

function base(payload) {
    return payload.bySites.buckets.map(function (v) {
        return v.byEvents.buckets.reduce(function (a, e) {
            a[e.key] = e.doc_count;
            return a;
        }, {site: v.key});
    });
}

function query(params) {
    return {
        size: 0,
        query: util.filter([
            util.includeEventTypes(['adStart', 'adEnded', 'adError']),
            util.createdBetween(params.starts, params.ends),
            {range: {loadTimeMs: {gt: 0}}},
            util.includingSites(params.sites),
            util.includeSiteGroup(params.sitegroup)
        ]),
        aggs: util.aggregateBySite(util.aggregateByEventType())
    };
}

module.exports = {
    base,
    query
};
