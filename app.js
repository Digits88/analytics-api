const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const analytics = require('./lib/analytics');
const config = require('./lib/config/default');
const log4js = require('log4js');
log4js.configure(config.log);
const logger = log4js.getLogger('out');

logger.info("Starting Analytics-API");

const router = new Router();
router.use(analytics.routes(), analytics.allowedMethods());

const app = new Koa();

app.use(bodyParser());
app.use(router.allowedMethods());
app.use(router.routes());

module.exports = app;
