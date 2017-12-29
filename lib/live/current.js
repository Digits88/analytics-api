const util = require('../query-utils.js');
const config = require('../config');
const log4js = require('log4js');
const core = require('../core.js');
const ovp = require('../support/ovp');
const parameterValidator = require('../middleware/validator').params;

log4js.configure(config.log);
const log = log4js.getLogger('out');


function transformCurrentView(payload) {
    const sequence = [];
    payload.aggregations.sitegroups.buckets.forEach(sitegroup => {
        sitegroup.sites.buckets.forEach(site => {
            site.lives.buckets.forEach(live => {
                sequence.push({
                    siteId: site.key,
                    id: live.key,
                    views: live.doc_count
                });
            });
        });
    });

    return sequence;
}

function queryCurrentViews(ctx) {
    const timestamp = new Date().getTime() - 60000;
    return {
        size: 0,
        query: util.filter([util.createdBetween(timestamp), util.includingSiteGroups(ovp.getSiteGroupId(ctx)), util.includingSites(ovp.getSites(ctx)), util.includeLiveIds(ctx.query.id)]),
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
                            lives: {
                                terms: {
                                    field: 'liveId.keyword',
                                    size: 100
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
    log.debug("live/current.show()");

    const client = core(null, config, log);

    function runQuery() {
        return new Promise(function (resolve, reject) {
            client.query(queryCurrentViews(ctx), 'Ping', 's_live', 0).then(resp => {
                resolve(transformCurrentView(resp));
            }).catch(err => {
                log.error(err.message);
                log.error(err.stack);
                reject(err);
            });
        });
    }

    ctx.body = await runQuery();
};
