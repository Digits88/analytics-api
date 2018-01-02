const mysql = require('mysql');
const config = require('../config');
const pool = mysql.createPool(config.db);
const log4js = require('log4js');
log4js.configure(config.log);
const log = log4js.getLogger('out');

function query(sql, values) {
    return new Promise(function (resolve, reject) {
        log.debug(sql);
        pool.query(sql, values || [], function (error, results, fields) {
            if (error) return reject(error);
            resolve(results);
        });
    });
}

async function find(sql, values) {
    const results = await query(sql, values);
    if (results) {
        return results;
    } else {
        throw new Error("No results for query " + sql);
    }
}

module.exports.get = async (userId, id) => {
    if (Array.isArray(id)) {
        var ids = id.reduce(function (acc, val) {
            // return prev ? prev + ", " + curr : curr;
            return acc ? `${acc}, '${val}'` : `'${val}'`;
        }, null);
        return await find("SELECT * FROM Video WHERE id IN (" + ids + ") AND user_id = '" + userId + "'");
    }
    return await find("SELECT * FROM Video WHERE user_id = ? AND id = ?", [userId, id]);
};


