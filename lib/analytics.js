const Router = require('koa-router');
const router = new Router();
const video_stats = require("./video/video_stats");
const viewers = require("./video/viewers");
const site_stats = require('./video/intervals');
const viewers_per_video = require('./video/viewers_per_video');
const views = require('./video/views');
const live_current = require('./live/current');
const live_summary = require('./live/summary');
const ovp_middleware = require('./middleware/ovp-middleware');

router.use('/', ovp_middleware);


router.get('/videos/:id', video_stats.validateShow, video_stats.show);

router.get('/current/videos', viewers_per_video.validateShow, viewers_per_video.show);
router.get('/current/viewers', viewers.validateShow, viewers.show);

router.get('/intervals', site_stats.validateShow, site_stats.show);
router.get('/views', views.validateShow, views.show);


router.get('/live/casts', live_current.validateShow, live_current.show);
router.get('/live/summary', live_summary.validateShow, live_summary.show);

module.exports = router;