const Router = require('koa-router');
const router = new Router();
const video_stats = require("./video/video_stats");

router.get('/videos/:id', video_stats.validateShow, video_stats.show);
// router.get('/videos/:id/interval', videos.showInterval);

module.exports = router;