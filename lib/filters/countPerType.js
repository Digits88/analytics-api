const moment = require('moment');
const util = require('../query-utils.js');

function query(params) {
    let starts = moment.utc(params.starts, 'YYYY-MM-DD', true).startOf('day').format('x'),
        ends = moment.utc(params.ends || params.starts, 'YYYY-MM-DD', true).endOf('day').format('x');

    return {
        size: 0,
        query: util.filter([util.createdBetween(starts, ends), {match: {vodId: params.vodid}}]),
        aggs: util.aggregateByField('types', '_type')
    };
}

function base(payload) {
    if (!payload.aggregations.types.buckets.length) {
        return {
            msg: 'no data found'
        };
    }

    return payload.aggregations.types.buckets.reduce(function (a, e) {
        a[e.key.toLowerCase()] = e.doc_count;
        return a;
    }, {});
}

module.exports = {
    base, query
};
