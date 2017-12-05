const config = require('./lib/config/default');

const app = require('./app');
module.exports = app.listen(config.server.port);
