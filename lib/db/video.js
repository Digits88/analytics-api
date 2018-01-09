const config = require('../config');
const log4js = require('log4js');
log4js.configure(config.log);
const db = require('./db');


module.exports.queryLength = db.queryLength;

const load = module.exports.get = async (userId, id) => {
    if (Array.isArray(id)) {
        return await db.query("SELECT * FROM Video WHERE id IN (" + db.inList(id) + ") AND user_id = '" + userId + "'");
    }
    return await db.query("SELECT * FROM Video WHERE user_id = ? AND id = ?", [userId, id]);
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