const config = require('../config');
const log4js = require('log4js');

log4js.configure(config.log);
const log = log4js.getLogger('out');

function average(array) {
    if (!array) {
        return 0;
    }

    if (array.length === 1) {
        return array[0];
    }

    let sum = array.reduce(function (a, v) {
        a += v;
        return a;
    }, 0);

    return sum / array.length;
}

function findNearest(obj, start, end, precentage) {
    const segments = obj.segments;

    if (!segments) {
        return;
    }

    if (segments.length === 1) {
        return segments[0];
    }

    let val = start + (end - start) * precentage, closestDistance, candidate;

    segments.forEach(function (v, i) {
        let currentDistance = Math.abs(val - v);

        if (i == 0 || currentDistance < closestDistance) {
            candidate = i;
            closestDistance = currentDistance;
        }
    });

    return candidate;
}

function analytics(obj, time = undefined, views = undefined, start = 0) {
    const segments = obj;

    if (!segments) {
        log.info('Segments are not defined');
        return {};
    }

    const
        startValue = segments[start],
        p75 = findNearest(segments, startValue, segments[segments.length - 1], 0.75),
        p50 = findNearest(segments, startValue, segments[p75], 0.5),
        p25 = findNearest(segments, startValue, segments[p50], 0.25),
        weighted = (startValue) ? average(segments) / startValue : 0,
        reachedEnd = (startValue) ? segments[segments.length - 1] / startValue : 0,
        struct = {
            durationSeconds: Math.round(time / 1000),
            reachedEnd,
            'percentile-25': p25 || 1,
            'percentile-50': p50 || 1,
            'percentile-75': p75 || 1,
            weighted
        };

    struct.weightedEngementPerViewSeconds = time && Math.round(0.001 * time * weighted);
    struct.accumulatedEngagementSeconds = time && views && Math.round(0.001 * time * weighted) * views;

    return struct;
}


module.exports = analytics;
