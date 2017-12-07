const errors = require('../errors.js');

/**
 * Generating function. Assumes that the payload is an array of objects.
 * Each unique property, create a new entry and use the property name as key
 * The item contains a property 'key' that has the property value as key and
 * a property value that is an array with tuples of [<key> <extracted value>]
 *
 * @example
 * payload =[{t:0, foo: 10, bar:20, sum:30}, {t:1, foo:1, bar:5, sum: 6}, {t:2, foo:40, bar:60, sum:1000}]
 * transpose('t', ['t', 'sum'], v=>v)
 * // [{key:'foo', values: [[0 10][1 1][2 40]]}, {key: 'bar', [[0 20][1 5][2 60]]}]
 */
function transpose(key, excludedKeys, extractValueFn) {
    return function (payload) {
        let resp = {};

        for (let el of payload) {
            let currentKey = el[key];

            for (let prop of Object.keys(el)) {
                if (excludedKeys.indexOf(prop) !== -1) {
                    continue;
                }

                if (resp[prop] === undefined) {
                    resp[prop] = {
                        key: prop,
                        values: []
                    };
                }

                resp[prop].values.push([currentKey, extractValueFn(el[prop])]);
            }
        }

        return Object.keys(resp).map(function (v) {
            return resp[v];
        });
    };
}

const nvd3Transpose = transpose('t', ['t'], v => v);

function nvd3(payload) {
    return {
        key: 'Errors per error cateogry',
        values: nvd3Transpose(payload)
    };
}

function render(payload, params) {
    let excludedCodes = (params.excluded || '').split(',').map(s => s.trim()) || [];
    let useSymbolicName = (params.useSymbolicName == 'true');
    return payload.by_time.buckets.map(function (bucket) {
        return bucket.byErrorCode.buckets.reduce(function (a, e) {
            let code = e.key;

            if (excludedCodes && !excludedCodes.some(v => v == code)) {
                let symbol = useSymbolicName && errors[e.key];
                a[symbol || e.key] = e.doc_count;
            }
            return a;
        }, {t: bucket.key});
    });
}

module.exports = {
    base: render,
    nvd3
};
