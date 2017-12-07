function csv(columns, includeHeader = true) {
    return function (data) {
        return data.reduce(function (a, e) {
            let row = columns.map(column => e[column] && e[column].toString());
            a.push(row);

            return a;
        }, includeHeader ? [Array.from(columns)] : []);
    };
}

function gdt(millis) {
    let d = new Date(millis);
    return `Date(${d.getUTCFullYear()},${d.getUTCMonth()},${d.getUTCDate()},${d.getUTCHours()},${d.getUTCMinutes()},${d.getUTCSeconds()})`;
}

function includeExcept(keys, excluded) {
    if (!excluded) {
        return keys;
    }

    return keys.filter(key => excluded.indexOf(key) === -1);
}

/**
 * Parse string as duration in milliseconds. Supports format HH:MM or HH:MM:SS or just SS
 * @param  {string} str the string to parse
 * @return {number|undefined}     the number of milliseconds or undefined if
 *                                str could not be parsed
 */
function duration(str) {
    const factor = [1000, 60000, 3600000];

    let parts = str.split(':', 3).reverse();

    let accumulated = 0, parsed;
    for (let i = 0; i < parts.length; i++) {
        parsed = parseInt(parts[i]);
        if (isNaN(parsed)) {
            return;
        }

        accumulated += parsed * factor[i];
    }

    return accumulated;
}


module.exports = {
    csv,
    includeExcept,
    gdt,
    duration
};
