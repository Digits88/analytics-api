const config = require('../config');
const log4js = require('log4js');

log4js.configure(config.log);
const log = log4js.getLogger('out');

const util = require('../query-utils.js');
const core = require('../core.js');
const parameterValidator = require('../middleware/validator').params;
const ovp = require('../support/ovp');

// const args = require('../support/vod-arguments');


function transformCurrentView(payload) {
    const sequence = [];
    payload.aggregations.sitegroups.buckets.forEach(sitegroup => {
        sitegroup.sites.buckets.forEach(site => {
            site.vods.buckets.forEach(vod => {
                sequence.push({
                    siteId: site.key,
                    id: vod.key,
                    viewers: vod.unique.value
                });
            });
        });
    });

    // sort in decreasing viewers order
    sequence.sort(util.sortDescending("viewers"));
    return sequence;
}

function queryCurrentViews(ctx) {
    const timestamp = new Date().getTime() - 60000;
    const params = ctx.query;

    // TODO: add VOD ownership check

    return {
        size: 0,
        query: util.filter([util.createdBetween(timestamp), util.includingSiteGroups(ovp.getSiteGroupId(ctx)), util.includingSites(ovp.getQuerySites(ctx)), util.includeVods(params.vod)]),
        aggs: {
            sitegroups: {
                terms: {
                    field: 'siteGroupId.keyword',
                    size: 1000
                },
                aggs: {
                    sites: {
                        terms: {
                            field: 'siteId.keyword',
                            size: 1000
                        },
                        aggs: {
                            vods: {
                                terms: {
                                    field: 'vodId.keyword',
                                    size: 100
                                },
                                aggs: {
                                    unique: {
                                        cardinality: {
                                            field: "sessionId.keyword"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
}

module.exports.validateShow = parameterValidator(Joi => {
    return Joi.object().keys({
        id: Joi.string().allow(null, ''),
        siteId: Joi.string().allow(null, '')
    })
});

module.exports.show = async ctx => {
    const client = core(undefined, config, log);

    function runQuery() {
        return new Promise(function (resolve, reject) {
            client.query(queryCurrentViews(ctx), 'Ping', 's_vod_segment', 0).then(resp => {
                resolve(transformCurrentView(resp));
            });
        });
    }

    ctx.body = await runQuery();
};
