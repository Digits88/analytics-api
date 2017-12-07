const moment = require('moment');


function sum(array, other) {
    if (!array) {
        return other;
    }

    if (!other) {
        return array;
    }

    for (var i = 0; i < array.length; i++) {
        array[i] = array[i] + (other[i] || 0);
    }

    return array;
}

function base(payload, params) {
    let segments;


    if (!payload.hits.hits.length) {
        //no data found
        return {
            vodId: params.vodid,
            msg: 'no data found'
        };
    }


    payload.hits.hits.forEach(function (v) {
        segments = sum(segments, v._source.segments);
    });


    let response = payload.hits.hits[0] && {
        vodId: payload.hits.hits[0]._source.vodId,
        segments: segments
    };

    return response;
}


function query(params) {
    let starts = moment.utc(params.starts, 'YYYY-MM-DD', true).startOf('day').format('x'),
        ends = moment.utc(params.ends, 'YYYY-MM-DD', true).endOf('day').format('x');

    return {
        size: 1000,
        query: {
            bool: {
                filter: [
                    {
                        match: {vodId: params.vodid}
                    },
                    {
                        range: {
                            created: {
                                gte: starts,
                                lte: ends
                            }
                        }
                    }
                ]
            }
        }
    };
}

module.exports = {
    base,
    query
};
