const config = require('../config');
const log4js = require('log4js');

log4js.configure(config.log);
const log = log4js.getLogger('out');


module.exports.show = async ctx => {
    log.info("show()");

    ctx.body = {views: 100};
};