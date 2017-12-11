const config = require('../config');
const log4js = require('log4js');

log4js.configure(config.log);
const log = log4js.getLogger('out');

const core = require('../core.js');
const util = require('../query-utils.js');
const parse = require('../support/vod-arguments.js');
const analytics = require('../support/vod-segments.js');
const filterUtil = require('../filters/util.js');
const validator = require('api-common/lib/middleware/validator');

const client = core(undefined, config, log);


const ASPECTS = [
    'display',
    'view',
    'views_desk',
    'views_mob',
    'views_tab',
    'views_os_mob_android',
    'views_os_mob_ios',
    'views_os_mob_winph'
];

/**
 * Aggregate for unprocessed displays
 * @type {Object}
 */
const unprocessedDisplayViewAggregates = {
    'types': {
        'terms': {
            'field': '_type',
            'include': ['Display', 'View']
        }
    }
};

/**
 * Aggregate for processed displays
 * @type {Object}
 */
const processedDisplayViewAggregates = {
    'nested': {
        'nested': {
            'path': 'aspects'
        },
        'aggs': {
            'terms': {
                'terms': {
                    'field': 'aspects.key',
                    'include': [
                        'display',
                        'view'
                    ]
                },
                'aggs': {
                    'sum': {
                        'sum': {
                            'field': 'aspects.value'
                        }
                    }
                }
            }
        }
    }
};

/**
 * Aggregate for unprocessed segments
 * @type {Object}
 */
const unprocessedSegmentsAggregate = {
    'terms': {
        'terms': {
            'exclude': [-1],
            'size': 101,
            'order': [{'_term': 'asc'}],
            'field': 'position'
        }
    }
};

/**
 * Aggregate for processed segments
 * @type {Object}
 */
const processedSegmentsAggregate = {
    'nested': {
        'nested': {
            'path': 'segments'
        },
        'aggs': {
            'terms': {
                'terms': {
                    'size': 101,
                    'field': 'segments.key',
                    'order': [{'_term': 'asc'}]
                },
                'aggs': {
                    'sum': {
                        'sum': {
                            'field': 'segments.value'
                        }
                    }
                }
            }
        }
    }
};

const processed = {
    match: {
        processed: true
    }
};

function queries(ctx, now) {
    const params = ctx.request.body;
    params.id = ctx.params.id;

    const parsed = parse(params);

    return {
        parsed,

        unprocessedDisplayView: {
            size: 0,
            query: util.filter([util.includeVods(parsed.vod), util.createdBetween(parsed.start, parsed.end)], processed),
            aggs: unprocessedDisplayViewAggregates
        },

        processedDisplayView: {
            size: 0,
            query: util.filter([util.includeVods(parsed.vod), util.createdBetween(parsed.start, parsed.end)]),
            aggs: processedDisplayViewAggregates
        },

        unprocessedSegments: {
            size: 0,
            query: util.filter([util.includeVods(parsed.vod), util.createdBetween(parsed.start, parsed.end)], processed),
            aggs: unprocessedSegmentsAggregate
        },

        processedSegments: {
            size: 0,
            query: util.filter([util.includeVods(parsed.vod), util.createdBetween(parsed.start, parsed.end)]),
            aggs: processedSegmentsAggregate
        }
    };
}

function extractAndAccumulateUnprocessedDisplayViews(resp, displayViews) {
    return resp.aggregations.types.buckets.reduce(function (agg, val) {
        if (val.key === 'Display') {
            agg.display += val.doc_count;
        }

        if (val.key === 'View') {
            agg.view += val.doc_count;
        }

        return agg;
    }, displayViews || {'display': 0, 'view': 0});
}

function extractAndAccumulateProcessedDisplayViews(resp, displayViews) {
    return resp.aggregations.nested.terms.buckets.reduce(function (agg, val) {
        if (val.key === 'display') {
            agg.display += val.sum.value;
        }

        if (val.key === 'view') {
            agg.view += val.sum.value;
        }

        return agg;
    }, displayViews || {'display': 0, 'view': 0});
}

function extractAndAccumulateUnprocessedSegments(resp, arr) {
    return resp.aggregations.terms.buckets.reduce(function (arr, val) {
        const index = val.key;

        if (index >= 0 && index < arr.length) {
            arr[index] += val.doc_count;
        }

        return arr;
    }, arr);
}

function extractAndAccumulateProcessedSegments(resp, arr) {
    return resp.aggregations.nested.terms.buckets.reduce(function (arr, val) {
        const index = val.key;

        if (index >= 0 && index < arr.length) {
            arr[index] += val.sum.value;
        }

        return arr;
    }, arr);
}

module.exports.validateShow = validator(Joi => {
    return Joi.object().keys({
        starts: Joi.date().format('YYYY-MM-DDTHH'),
        ends: Joi.date().format('YYYY-MM-DDTHH')
    })
});

module.exports.show = async ctx => {
    log.info("show()");

    const q = queries(ctx, new Date().getTime());

    const displays = ASPECTS.reduce(function (agg, val) {
        if (val == 'display' || val == 'view') {
            agg[val] = 0;
        } else {
            agg[val] = -1;
        }

        return agg;
    }, {});


    function runQueries() {
        return Promise.all([
            client.query(q.unprocessedDisplayView, 'Display,View', 'u_vod', 0),
            client.query(q.unprocessedSegments, 'Ping', 'u_vod', 0),
            client.query(q.processedDisplayView, 'Display', 'p_vod', 0),
            client.query(q.processedSegments, 'Segment', 'p_vod', 0)
        ]);
    }

    [u_disp, u_segment, p_disp, p_segment] = await runQueries();

    let displayViews = displays;
    let segments = new Array(100).fill(0);

    displayViews = extractAndAccumulateUnprocessedDisplayViews(u_disp, displayViews);
    displayViews = extractAndAccumulateProcessedDisplayViews(p_disp, displayViews);

    segments = extractAndAccumulateUnprocessedSegments(u_segment, segments);
    segments = extractAndAccumulateProcessedSegments(p_segment, segments);

    const a = analytics(segments, ctx.params.time && filterUtil.duration(ctx.params.time), displays.views);

    ctx.body = {
        displayViews,
        segments,
        analytics: a,
        time: {
            start: q.parsed.start,
            end: q.parsed.end
        }
    };

};