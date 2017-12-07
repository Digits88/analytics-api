const util = require('../query-utils.js');

function base(payload) {
    return payload;
}

function query(params) {
    return {
        size: 0,
        query: util.filter([util.includingSites(params.site), util.createdBetween(params.starts, params.ends), {
            match: {eventType: 'adError'}
        }]),
        aggs: util.aggregatedByTime(util.aggregateByField('codes', 'errorCode'), params.interval)
    };
}

module.exports = {
    base,
    query
};
