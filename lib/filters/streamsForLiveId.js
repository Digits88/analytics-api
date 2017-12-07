const util = require('../query-utils.js');

function base(payload) {
    return payload.numberOfStreams;
}

function query(params) {
    return {
        size: 0,
        query: util.filter([
            util.createdBetween('now-1m'),
            {match: {'liveId.tokenized': params.liveId}}
        ]),
        aggs: {
            'numberOfStreams': {
                'value_count': {
                    'field': 'liveId.tokenized'
                }
            }
        }
    };
}

module.exports = {
    query,
    base
};
