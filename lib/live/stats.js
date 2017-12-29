const util = require('../query-utils.js');
const config = require('../config');
const log4js = require('log4js');

log4js.configure(config.log);
const log = log4js.getLogger('out');

const core = require('../core.js');

function trimSequence(arr, threshold) {
    if (isNaN(threshold)) {
        throw Error(`a number was expected as threshold: ${threshold}`);
    }


    let firstAboveThreshold = arr.findIndex(el => el.doc_count > threshold);

    if (firstAboveThreshold === -1) {
        return [];
    }

    let lastAboveThreashold = firstAboveThreshold;
    for (let i = firstAboveThreshold + 1; i < arr.length; i++) {
        if (arr[i].doc_count > threshold) {
            lastAboveThreashold = i;
        }
    }

    return arr.slice(firstAboveThreshold, lastAboveThreashold + 1);
}

function transformByLiveId(payload, threshold) {
    //trim threshold defines the limit at start and in the end respectively to
    //consider as 0 when attempt to trim time-sequence. If not defined, no trimming
    //will be made

    let parsedThreshold = threshold && parseInt(threshold),
        sequence = payload.aggregations.timeSinceStart.buckets;

    if (parsedThreshold) {
        sequence = trimSequence(sequence, parsedThreshold);
    }

    return sequence.reduce(function (acc, el) {
        acc[el.key] = el.doc_count;
        return acc;
    }, {});

}

function queryViewsByLiveId(ctx) {
    return {
        size: 0,
        query: util.filter([util.createdBetween(ctx.query.start, ctx.query.end), {match: {liveId: ctx.params.id}}]),
        aggs: {
            timeSinceStart: {
                'date_histogram': {
                    field: 'created',
                    interval: '60s'
                }
            }
        }
    };
}

module.exports.show = async ctx => {
    const client = core(undefined, config, log);

    function runQuery() {
        return new Promise(function (resolve, reject) {

            // TODO: WTF there is no index called live_stat_entry

            client.query(queryViewsByLiveId(ctx), undefined, 'live_stat_entry', 0).then(resp => {
                resolve(transformByLiveId(resp, ctx.query.trim));
            }).catch(err => {
                log.error(err.message);
                log.error(err.stack);
                reject(err);
            });
        });
    }

    ctx.body = await runQuery();
};
