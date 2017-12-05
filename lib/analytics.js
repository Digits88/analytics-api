const Router = require('koa-router');
const router = new Router();
const videos = require("./video");

router.get('/videos/:id', videos.show);
// router.get('/videos/:id/interval', videos.showInterval);

module.exports = router;