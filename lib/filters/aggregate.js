function aggregateRequestForSite(payload) {
    return payload.aggregations.bySites.buckets.reduce(function (a, e) {
        a[e.key] = {
            site: e.key,
            requests: e.doc_count
        };

        return a;
    }, {
        all: {
            requests: payload.hits.total
        }
    });
}

function aggegrateAdEvents(payload) {
    let sums = {};

    let buckets = payload.aggregations.bySites.buckets.reduce(function (a, e) {
        a[e.key] = e.byEvents.buckets.reduce(function (a2, e2) {
            a2[e2.key] = e2.doc_count;

            if (!sums[e2.key]) {
                sums[e2.key] = a2[e2.key];
            } else {
                sums[e2.key] += a2[e2.key];
            }

            return a2;
        }, {
            site: e.key
        });

        return a;
    }, {});

    return Object.assign(buckets, {all: sums});
}

function ratio(arr) {
    function rationBySite(site, label = undefined) {
        let n = arr[0][site].requests;

        return {
            site: label || site,
            not_started: 1 - (arr[1][site].adStart / n),
            completed: arr[1][site].adEnded / n
        };
    }

    return Object.keys(arr[0]).reduce(function (a, key) {
        if (key !== 'all') {
            a.push(rationBySite(key));
        }

        return a;
    }, [rationBySite('all', '__ALL__')]);
}

function completionRate(payload) {
    return ratio([aggregateRequestForSite(payload[0]), aggegrateAdEvents(payload[1])]);
}


module.exports = {
    completionRate
};
