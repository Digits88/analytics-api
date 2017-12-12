const Router = require('koa-router');
const router = new Router();
const video_stats = require("./video/video_stats");
const video_current = require("./video/video_current");

router.get('/videos/:id', video_stats.validateShow, video_stats.show);
router.get('/videos/:id/current', video_current.validateShow, video_current.show);

// router.get('/videos/:id/interval', videos.showInterval);

module.exports = router;