/**
 * Creates a struct with the given key and value
 * @param  {string} key  the name of the key
 * @param  {*} value the value
 * @return {Object}       the struct
 */
function kv(key, value) {
    const struct = {};

    struct[key] = value;

    return struct;
}

/**
 * Creates a set of conjuctive range elements
 * @param  {String[]} ranges an array of time expressions
 * @return {Object[]}        a matching array of range elements
 */
function transformRanges(ranges) {
    if (!ranges) {
        return [];
    }

    if (ranges.length === 1) {
        return [
            {
                from: ranges[0]
            }
        ];
    }

    const transformed = [];

    for (var i = 0; i < ranges.length - 1; i++) {
        transformed.push({
            from: ranges[i],
            to: ranges[i + 1]
        });
    }

    return transformed;
}

/**
 * Filter to create range filter for created
 * @param  {string} gte expression for greater than or equal
 * @param  {string} lt  expression for less than
 * @return {Object}     fragment to return
 */
function createdBetween(gte, lt) {
    return {
        range:
            {
                created: {
                    gte, lt
                }
            }
    };
}

function weekAgo(now) {
    return (now || new Date().getTime()) - 604800000;
}

function olderThanOneWeek(now) {
    return createdBetween(null, weekAgo(now));
}

function newerThanOneWeek(now) {
    return createdBetween(weekAgo(now), null);
}

function includeEventTypes(includingTypes) {
    if (!includingTypes || includingTypes.length === 0) {
        return;
    }

    if (Array.isArray(includingTypes)) {
        return {
            terms: {eventType: includingTypes}
        };
    }

    return {
        match: {eventType: includingTypes}
    };

}

/**
 * Filter that takes a string or an arzray of strings to create a filter selecting
 * which sites to opt-in
 * @param  {string|string[]} includingSites sites to include
 * @return {Object}                filter fragment
 */
function includingSites(sites) {
    if (!sites || sites.length === 0) {
        return;
    }

    if (Array.isArray(sites)) {
        return {
            terms: {siteId: sites}
        };
    }

    return {
        match: {siteId: sites}
    };
}

function includeCategories(categories) {
    if (!categories || categories.length === 0) {
        return;
    }

    if (Array.isArray(categories)) {
        return {
            terms: {category: categories}
        };
    }

    return {term: {category: categories}};
}

function includeLiveIds(liveIds) {
    if (!liveIds || liveIds.length === 0) {
        return;
    }

    if (Array.isArray(liveIds)) {
        return {
            terms: {liveId: liveIds}
        };
    }

    return {
        match: {liveId: liveIds}
    };
}

function includeVods(vods) {
    if (!vods || vods.length === 0) {
        return;
    }

    if (Array.isArray(vods)) {
        return {
            terms: {vodId: vods}
        };
    }

    return {
        match: {vodId: vods}
    };
}

/**
 * Filter that filters given siteGroup
 * @param  {string} siteGroup the sitegroup to include
 * @return {Object|undefined}           filter fragment if siteGroup is defined
 */
function includingSiteGroups(siteGroup) {
    if (!siteGroup) {
        return;
    }

    if (Array.isArray(siteGroup)) {
        return {terms: {siteGroupId: siteGroup}};
    }

    return {
        match: {
            siteGroupId: siteGroup
        }
    };
}

/**
 * Filter that filters given siteGroup
 * THIS IS DEPRECATED
 * @param  {string} siteGroup the sitegroup to include
 * @return {Object|undefined}           filter fragment if siteGroup is defined
 */
function includeSiteGroup(siteGroup) {
    logger.warn('usage of includeSiteGroup() is DEPRECATED. Please change the usage');

    if (!siteGroup) {
        return;
    }

    if (Array.isArray(siteGroup)) {
        return {terms: {siteGroupId: siteGroup}};
    }

    return {
        match: {
            siteGroupId: siteGroup
        }
    };
}


/**
 * Filter that filters given siteGroup
 * THIS IS DEPRECATED
 * @param  {string} siteGroup the sitegroup to include
 * @return {Object|undefined}           filter fragment if siteGroup is defined
 */
function includeSiteGroupId(siteGroupId) {
    logger.warn('usage of includeSiteGroupId() is DEPRECATED. Please change the usage');

    if (!siteGroupId) {
        return;
    }

    return {
        term: {
            siteGroupId
        }
    };
}


/**
 * Create a bool filter with one or many expressions
 * @param  {Object[]} exprs Set of expressions. Any undefined elements are not
 *                          renderedx
 * @return {Object}       filter fragment
 */
function filter(exprs, mustNotExprs = []) {
    if (!Array.isArray(mustNotExprs)) {
        mustNotExprs = [mustNotExprs];
    }

    return {
        bool: {
            filter: exprs.reduce(function (a, e) {
                if (e) {
                    a.push(e);
                }

                return a;
            }, []),
            must_not: mustNotExprs.reduce(function (a, e) {
                if (e) {
                    a.push(e);
                }

                return a;
            }, [])
        }
    };
}

/**
 * Bucket aggration of siteId
 * @param  {Number} [maxSize=500] the max number of term buckets
 * @return {Object}               aggregation fragment
 */
function aggregateByField(name, field, aggs, size = 500) {
    let query = {};

    let byTerm = {
        terms: {
            field,
            size
        }
    };

    query[name] = byTerm;


    if (aggs) {
        query[name].aggs = aggs;
    }

    return query;
}

/**
 * Sum aggregation
 * @param  {String} name  name of the aggregation
 * @param  {String} field field to sum
 * @param  {Object|undefined} aggs  optional Sub-aggregation
 * @return {Object}       aggregation fragment
 */
function aggregateBySum(name, field, aggs) {
    let fragment = {};

    fragment[name] = {
        'sum': {
            'field': field
        }
    };

    if (aggs) {
        fragment[name].aggs = aggs;
    }

    return fragment;
}

function cardinality(name, field, threshold) {
    let fragment = {};

    fragment[name] = {
        cardinality: {
            field
        }
    };

    if (threshold) {
        fragment[name].cardinality.precision_threshold = threshold;
    }

    return fragment;
}

/**
 * Nested aggregation. Although the sub-aggregation is optional the
 * aggregation will be pretty use-less without any. Therefore it is
 * assumed there is a sub-aggregation
 * @param  {String} name name of the aggregation
 * @param  {String} path the path for nested property
 * @param  {Object} aggs sub-aggregation
 * @return {Object}      aggregation fragment
 */
function nestedAggregagtion(name, path, aggs) {
    let fragment = {};

    fragment[name] = {
        nested: {
            path
        },
        aggs
    };

    return fragment;
}

/**
 * Date histogram aggregation
 * @param  {Object} aggs                 Sub-aggregation to attach
 * @param  {String} [interval='1d']      the interval of date aggregation
 * @param  {String} [time_zone='+02:00'] time zone to apply to the aggregation
 * @return {Object}                      aggregation fragment
 */
function aggregatedByTime(aggs, interval = '1d', time_zone = '+02:00', min_doc_count = 0) {
    return {
        byTime: {
            date_histogram: {
                field: 'created',
                interval,
                time_zone,
                min_doc_count
            },
            aggs
        }
    };
}

/**
 * Bucket aggration of siteId
 * @param  {Number} [maxSize=500] the max number of term buckets
 * @return {Object}               aggregation fragment
 */
function aggregateBySite(aggs, maxSize = 500) {
    let query = {
        bySites: {
            terms: {
                field: 'siteId',
                size: maxSize
            }
        }
    };

    if (aggs) {
        query.bySites.aggs = aggs;
    }

    return query;
}

function aggregatedByLiveId(size) {
    return aggregateByField('byLiveId', 'liveId.tokenized', size);
}


function aggregateByEventType(aggs, maxSize = 500) {
    const query = {
        byEvents: {
            terms: {
                field: 'eventType',
                size: maxSize
            }
        }
    };

    if (aggs) {
        query.bySites.aggs = aggs;
    }

    return query;
}


/**
 * Aggregration based on time ranges
 * @param  {String} name                 name of the aggregration
 * @param  {String} field                field name to aggregate on
 * @param  {String[]} ranges             array of ranges of start limits
 * @param  {Object} aggs                 subaggregration to attach
 * @param  {String} [time_zone='+02:00'] time zone for aggregation
 * @return {Object}                      aggregation fragment
 */
function aggregateByTimeRanges(name, field, ranges, aggs, time_zone = '+02:00') {
    const query = {
        date_range: {
            field,
            time_zone,
            ranges: transformRanges(ranges)
        }
    };

    if (aggs) {
        query.aggs = aggs;
    }

    return kv(name, query);
}

function sortDescending(sortField) {
    return function (a, b) {
        if (a[sortField] > b[sortField]) {
            return -1;
        }
        if (a[sortField] < b[sortField]) {
            return 1;
        }
        return 0;
    }
}

module.exports = {
    createdBetween,
    includeEventTypes,
    includingSiteGroups,
    includingSites,
    includeVods,
    includeLiveIds,
    includeCategories,
    filter,
    nestedAggregagtion,
    aggregateByField,
    aggregatedByTime,
    aggregateBySum,
    aggregateByTimeRanges,
    //these are subject to deprecation
    includeSiteGroupId,
    includeSiteGroup,
    aggregateBySite,
    aggregateByEventType,
    aggregatedByLiveId,
    cardinality,
    olderThanOneWeek,
    newerThanOneWeek,
    sortDescending
};
