function percentile50(payload) {
    let perServer = {};
    payload.forEach(el => {
        //
        let currentTime = el.t;
        for (let k of Object.keys(el)) {
            let v = el[k];

            if (k === 't' || k === 'c') {
                continue;
            }

            if (perServer[k] === undefined) {
                perServer[k] = [];
            }

            perServer[k].push({
                when: currentTime,
                val: v['50.0']
            });
        }
    });

    return Object.keys(perServer).map(k => {
        return {
            key: k,
            values: perServer[k]
        };
    });
}


function renderRow(bucket) {
    return bucket.bySites.buckets.reduce(function (a, e) {
        a[e.key] = e.inPercentiles.values;
        return a;
    }, {
        t: bucket.key,
        c: bucket.doc_count
    });

}

function render(payload) {
    return payload.byTime.buckets.map(renderRow);
}

module.exports = {
    base: render,
    percentile50
};
