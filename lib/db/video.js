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

function isArray(value) {
    if (Array.isArray(value)) return true;
    if (value.startsWith("[") && Array.isArray(JSON.parse(value))) return true;
    return false;
}

function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value.startsWith("[") && Array.isArray(JSON.parse(value))) return JSON.parse(value);
    return [value];
}

module.exports.queryLength = (idValue) => {
    if (!idValue) return 0;
    if (!isArray(idValue)) return 0;
    return toArray(idValue).length;
};

const load = module.exports.get = async (userId, id) => {
    if (isArray(id)) {
        let ids = toArray(id).reduce(function (acc, val) {
            // return prev ? prev + ", " + curr : curr;
            return acc ? `${acc}, '${val}'` : `'${val}'`;
        }, null);
        return await find("SELECT * FROM Video WHERE id IN (" + ids + ") AND user_id = '" + userId + "'");
    }
    return await find("SELECT * FROM Video WHERE user_id = ? AND id = ?", [userId, id]);
};

module.exports.getOne = async (userId, id) => {
    const videos = await load(userId, id);
    if (!videos) return null;
    if (videos.length == 0) return null;
    return videos[0];
};

function pick(o, ...fields) {
    return fields.reduce((a, x) => {
        if (o.hasOwnProperty(x)) a[x] = o[x];
        return a;
    }, {});
}

module.exports.slimVideo = function (videoInDb) {
    const video = pick(videoInDb, "id", "description", "duration", "videoName", "created");
    video.name = video.videoName;
    delete video.videoName;
    return video;
};