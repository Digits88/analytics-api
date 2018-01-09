const config = require('../config');
const log4js = require('log4js');
log4js.configure(config.log);
const db = require('./db');

module.exports.get = async (id, sites) => {
    return await db.query("SELECT * FROM ScheduleSlot WHERE id = '" + id + "' AND site_id IN  (" + db.inList(sites) + ")");
};

module.exports.queryLength = db.queryLength;
