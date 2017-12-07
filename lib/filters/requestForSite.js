const util = require('../query-utils.js');


function query(params) {
    return {
        size: 0,
        query: util.filter([
            util.createdBetween(params.starts, params.ends),
            {range: {loadTimeMs: {gt: 0}}},
            util.includingSites(params.sites),
            util.includeSiteGroup(params.sitegroup)
        ]),
        aggs: util.aggregateBySite()
    };
}

function base(payload) {
    return payload;
}

module.exports = {
    base,
    query
};
