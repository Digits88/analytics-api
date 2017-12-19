const Router = require('koa-router');
const router = new Router();
const video_stats = require("./video/video_stats");
const video_current = require("./video/video_current");
const site_stats = require('./video/site_stats');
const ovp_middleware = require('./middleware/ovp-middleware');

router.use('/', ovp_middleware);


router.get('/videos/:id', video_stats.validateShow, video_stats.show);

router.get('/current', video_current.validateShow, video_current.show);
router.get('/interval', site_stats.show);

// router.get('/videos/:id/interval', videos.showInterval);

module.exports = router;