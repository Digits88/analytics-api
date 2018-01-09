const mysql = require('mysql');
const config = require('../config');
const pool = mysql.createPool(config.db);
const log4js = require('log4js');
log4js.configure(config.log);
const log = log4js.getLogger('out');

function executeQuery(sql, values) {
    return new Promise(function (resolve, reject) {
        log.debug(sql);
        pool.query(sql, values || [], function (error, results, fields) {
            if (error) return reject(error);
            resolve(results);
        });
    });
}

module.exports.query = async function (sql, values) {
    const results = await executeQuery(sql, values);
    if (results) {
        return results;
    } else {
        throw new Error("No results for query " + sql);
    }
};

module.exports.inList = values => {
    return values.reduce(function (acc, val) {
        return acc ? `${acc}, '${val}'` : `'${val}'`;
    }, null);
};

module.exports.queryLength = (idValue) => {
    if (!idValue) return 0;
    if (!Array.isArray(idValue)) return 1;
    return idValue.length;
};
