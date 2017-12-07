const filters = require('./filters');
const es = require('elasticsearch');
const config = require('./config');


/**
 * Construct the path to use for the Elasticsearch query
 * @param  {string}  index         the index to use
 * @param  {string|undefined}  requestedType the type to limit the query to
 * @param  {Boolean} isTemplate    whether the query is a search template or not
 * @return {string}                the query path
 */
function queryPath(index, requestedType, isTemplate = false) {
    let base = `/${index}`,
        typePart = requestedType && `/${requestedType}`,
        templatePart = isTemplate && '/template';


    return `${base}${typePart || ''}/_search${templatePart || ''}`;
}

function identity(payload) {
    return payload;
}

/**
 * Isolates query and count query methods
 */
function clientApi(client, config, logger) {
    const esClient = new es.Client({
        hosts: config.elasticsearch.url,
        apiVersion: '5.4'
    });

    function transform(filters, baseName, pipeName) {
        let baseFn = filters[baseName] && filters[baseName].base;

        if (!baseFn) {
            logger.warn(`could not find ${baseName}`);
            return identity;
        }

        let optionalPipeFn = filters[baseName][pipeName];

        if (optionalPipeFn) {
            return function (payload, params) {
                return optionalPipeFn(baseFn(payload, params), params);
            };
        } else {
            return baseFn;
        }
    }

    function doCountQuery(req, res, next) {
        let requestUrl = '/' + config.elasticsearch.index + '/_count';

        new Promise(function (resolve, reject) {
            client.get(requestUrl, function (err, req, res) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(JSON.parse(res.body).count);
            });
        }).then(function (count) {
            res.send(200, count);
        }).catch(function (err) {
            res.contentType = 'json';
            res.send(500, JSON.stringify(err));
        });

        return next();
    }


    function queryAndScroll(body, type, index, consume, finish = undefined, size = 100, scroll = '60s') {
        logger.debug('queryAndScroll');
        const finishFn = finish || function () {
            return {};
        };

        return esClient.search({
            size,
            index,
            type,
            scroll,
            body
        }).then(function getMoreUntilDone(resp) {
            if (resp.hits.total === 0) {
                return Promise.resolve(finishFn());
            }

            if (resp.hits.hits.length === 0) {
                logger.debug('reached end:' + resp._scroll_id);
                logger.debug('processed total: ' + resp.hits.total + ' items');
                return Promise.resolve(finishFn());
            }

            consume(resp.hits.hits);
            return esClient.scroll({
                scrollId: resp._scroll_id,
                scroll
            }).then(getMoreUntilDone);
        });
    }


    /**
     * Processes query from programmatically constructed query. This is feasible
     * when query is complex and may contain conditional constraints
     *
     * @param {Object}  req from restify
     * @param  {Query}  query the query to process
     * @param {string|undefined} requestedType the index to limit the query
     *                                         otherwise query the index
     * @return {Promise} promise with response body
     */
    function processQueryFromJs(body, type, index = config.elasticsearch.index, size = 100) {

        let path = queryPath(index, type, false);

        if (!body) {
            Promise.reject(Error('query must be defined'));
        }

        logger.debug('querying ', path);
        return esClient.search({
            size,
            index,
            type,
            body
        }).then(function (res) {
            return Promise.resolve(res);
        }).catch(function (err) {
            return Promise.reject(err);
        });

    }

    function query(body, type, index, size = 100) {
        logger.debug('query');
        logger.debug('processing query', JSON.stringify(body));

        return esClient.search({
            size,
            index,
            type,
            body
        }).catch(function (err) {
            logger.error('failed to execute query');
            logger.error(err);
        });
    }

    /**
     * Performs query and return
     * @param  {Object} req           from restify
     * @param  {string} requestedType the requested type of query
     * @return {promise}               promise of fetched result
     */
    function performQuery(req, requestedType, requestedIndex, query = undefined) {
        let queryName = query || req.params.query;

        let requestedQuery = filters[queryName] && filters[queryName].query;
        let base = filters[queryName].base;
        let promise;

        if (requestedQuery) {
            logger.debug('fetch query from js');
            logger.debug('processing query', JSON.stringify(query));
            logger.debug('processing query with params:', req.params);

            promise = processQueryFromJs(requestedQuery(req.params), requestedType, requestedIndex).then(function (resp) {
                return Promise.resolve(base(resp, req.params));
            });
        } else {
            throw Error('query could not be found');
        }

        return promise;
    }

    /**
     * Currenty /r/q/* is similar to /e/q/* although we are handling different
     * kind of queries (requests and events). In the future the paths should not
     * access the same set of queries
     */
    function doQuery(req, res, next, requestedType, requestedIndex, query = undefined, respFrom = 'aggregations') {
        performQuery(req, requestedType, requestedIndex, query).then(function (data) {
            let requestedQuery = query || req.params.query;

            if (!filters[requestedQuery]) {
                logger.warn('could find filter for query:', requestedQuery);
            }

            logger.debug('processing response');

            let transformFn = transform(filters, requestedQuery, req.params.filter);

            res.send(transformFn(data[respFrom], req.query));
        }).catch(function (e) {
            logger.error(e);
            let statusCode = 500, msg = new Error('request failed: reason unkown');

            if (e.body) {
                [statusCode, msg] = [e.statusCode, new Error(e.body.error.caused_by.reason)];
            }

            logger.error('Request failed', msg);

            res.send(statusCode, msg);
        });

        return next();
    }

    function doAdRequestQuery(req, res, next) {
        return doQuery(req, res, next, 'adRequest', config.elasticsearch.index);
    }

    function doAdEventQuery(req, res, next) {
        req.query.site = req.params.site;


        return doQuery(req, res, next, 'adEvent', config.elasticsearch.index);
    }

    function doLiveQuery(requestedType) {
        return function (req, res, next) {
            return doQuery(req, res, next, requestedType, config.elasticsearch.liveIndex);
        };
    }

    function doVodQuery(requestedType) {
        return function (req, res, next) {
            return doQuery(req, res, next, requestedType, config.elasticsearch.vodIndex);
        };
    }

    function doVodStatQuery(requestedType, extract = 'hits') {
        return function (req, res, next) {
            return doQuery(req, res, next, requestedType, config.elasticsearch.segmentIndex, undefined, extract);
        };
    }

    function doSimpleQuery(query, extractFn, requestedType, index = config.elasticsearch.index) {
        const path = requestedType ?
            `/${index}/${requestedType}/_search` :
            `/${index}/_search`;

        return function (req, res, next) {
            client.post(path, query, function (err, clientReq, clientResp) {
                if (err) {
                    logger.error(err);
                    res.send(clientResp.statusCode, err);
                    return next();
                }

                res.json(extractFn(JSON.parse(clientResp.body)));
                return next();
            });
        };
    }

    function doAggregatedQuery(req, res, next) {
        res.send(500, 'aggregated queries are not supported anymore');

        return next();
    }


    function healthCheck(req, res, next) {
        res.send(204);
        next();
    }

    return {
        logger,
        queryAndScroll,
        query,
        doVodStatQuery,
        doAggregatedQuery,
        doAdRequestQuery,
        doAdEventQuery,
        doCountQuery,
        doSimpleQuery,
        doLiveQuery,
        doVodQuery,
        healthCheck
    };
}


module.exports = clientApi;
