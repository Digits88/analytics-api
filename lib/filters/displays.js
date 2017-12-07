const util = require('../query-utils.js');

function base(payload, params) {
    let threshold = params.threshold || 0;


    return payload.nested.aspects.buckets.reduce(function (a, e) {
        if (e.total.value >= threshold) {
            a[e.key] = e.total.value;
        }

        return a;
    }, {});
}

function filter(params) {
    return util.filter([
        util.createdBetween(params.starts, params.ends),
        util.includeVods(params.vodid)]);
}

function aggregation() {
    return util.nestedAggregagtion('nested', 'aspects',
        util.aggregateByField('aspects', 'aspects.key',
            util.aggregateBySum('total', 'aspects.value'), 50));
}

function query(params) {
    return {
        'size': 0,
        'query': filter(params),
        'aggs': aggregation()
    };
}

module.exports = {
    base, query
};
