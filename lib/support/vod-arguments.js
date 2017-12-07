const moment = require('moment');

const formatErrors = {
    interval: function (interval) {

        let msgs = [];

        if (interval.errors.start) {
            msgs.push(`start time must be in form YYYY-MM-DD or YYYY-MM-DDTHH: ${interval.input.start}`);
        }

        if (interval.errors.end) {
            msgs.push(`end time must be in form YYYY-MM-DD or YYYY-MM-DDTHH: ${interval.input.end}`);
        }

        return `param or param(s) specifying time interval are malformed: ${msgs.join(',') || ''}`;
    }
};

/**
 * Calculates the time interval for the query:
 *
 * * The time interval must either be in the form YYYY-MM-DD or YYYY-MM-DDTHH
 * * If both defined the startTime must occur before endTime
 * * startTime and endTime if both defined must use the same granularity
 * @param  {string|undefined} [startTime=undefined]    the start time
 * @param  {string|undefined} [endTime=undefined]      the end time
 * @return {{input: {start:string,end:string}, parsed: {start: number, end: number}, errors: {start:boolean, end:boolean}, valid: boolean}} the start and end time in epoch_millis
 */
function calculateInterval(startTime = undefined, endTime = undefined) {
    /**
     * Parses time expression. The expression is supposed to comply with the
     * format YYYY-MM-DD or YYYY-MM-DDTHH
     * @param  {number|string|undefined} time          the time expression
     * @param  {boolean} [endOfInterval=false] if true, the interval is extended to forthcoming
     *                                 interval, the day or hour depending of the
     *                                 provided expression
     *
     * @return {{ts: number|undefined, valid: boolean}}   structure with timestamp and whether
     *                                          the expression were valid or not
     */
    function parseTime(time, endOfInterval = false) {
        if (!time) {
            return {
                valid: true
            };
        }

        if (Number.parseInt(time) == time) {
            return {
                ts: Number.parseInt(time),
                valid: true
            };
        }

        let mDay = moment(time, 'YYYY-MM-DD');
        if (mDay.isValid()) {
            if (endOfInterval) {
                mDay.add(1, 'd');
            }

            return {
                ts: Number.parseInt(mDay.format('x')),
                valid: true
            };
        }

        return {
            valid: false
        };
    }

    let parsedStartTime = parseTime(startTime), parsedEndTime = parseTime(endTime, true);

    if (parsedStartTime.valid && parsedEndTime.valid) {
        return {
            input: {
                start: startTime,
                end: endTime
            },
            parsed: {
                start: parsedStartTime.ts,
                end: parsedEndTime.ts
            },
            valid: true
        };
    } else {
        return {
            input: {
                start: startTime,
                end: endTime
            },
            parsed: {},
            errors: {
                start: !parsedStartTime.valid,
                end: !parsedEndTime.valid
            },
            valid: false
        };
    }
}

/**
 * Parses time arguments
 * @param  {Object} params                parameters from http request
 * @param  {String} [startParam='starts'] the name of the start parameter
 * @param  {String} [endParam='ends']     the name of the end parameters
 * @return {{start:number, end: number, vod: string}}   the parsed start and end time
 */
function parseArguments(params, requireVodArg = true, startParam = 'starts', endParam = 'ends') {
    const timeInterval = calculateInterval(params[startParam], params[endParam]);

    if (requireVodArg && !params.id) {
        throw Error('expected argument \'vod\' to be defined');
    }

    if (!timeInterval.valid) {
        throw Error(formatErrors.interval(timeInterval));
    }

    return {
        start: timeInterval.parsed.start,
        end: timeInterval.parsed.end,
        vod: params.vod
    };
}

module.exports = parseArguments;
