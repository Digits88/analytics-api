const util = require('../query-utils.js');

function completetion(payload) {
    return Array(101).fill(0).map(function (v, i) {
        let foundIndex = payload.findIndex(v => v.key === i);
        if (foundIndex === -1) {
            return 0;
        } else {
            let value = payload[foundIndex];
            payload.splice(foundIndex, 1);
            return value.doc_count;
        }
    });
}

function rate(serie) {
    let sum = serie.slice(1, serie.length).reduce(function (a, e) {
        a += e;
        return a;
    }, 0);

    return sum / (serie.length - 1);
}

function vod(payload) {
    let c = completetion(payload.positions.buckets);
    return {
        vod: payload.key,
        views: c[0],
        completionRate: parseFloat((rate(c) / c[0]).toPrecision(3)),
        viewsOverTime: c.slice(1, c.length)
    };
}

function site(payload) {
    return {
        site: payload.key,
        vods: payload.vods.buckets.reduce(function (a, e) {
            a.push(vod(e));
            return a;
        }, [])
    };
}

function base(payload) {
    return payload.sites.buckets.reduce(function (a, e) {
        a.push(site(e));
        return a;
    }, []);
}

function query(params) {
    return {
        size: 0,
        query: util.filter([
            util.includeSiteGroupId(params.sitegroup),
            util.includingSites(params.sites),
            util.includeVods(params.vods),
            util.createdBetween(params.starts, params.ends)
        ]),
        aggs: util.aggregateByField('sites', 'siteId', util.aggregateByField('vods', 'vodId', util.aggregateByField('positions', 'position')))
    };
}

module.exports = {
    base,
    query
};
