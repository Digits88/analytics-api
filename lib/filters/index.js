const adErrorBySite = require('./adErrorBySite2');
//const adErrorBySite2 = require('./adErrorBySite2');
const responseTimePerServer = require('./responseTimePerServer');
const adEvents = require('./adEvents');
const requestPerSite = require('./requestPerSite');
const requests = require('./requests');
const requestForSite = require('./requestForSite');
const currentLive = require('./currentLive');
const currentLivePerSite = require('./currentLivePerSite');
const viewsPerSite = require('./viewsPerSite');
const streamsForLiveId = require('./streamsForLiveId');
const vodStatistics = require('./vodStatistics');
const aggregate = require('./aggregate');
const segments = require('./segments');
const countPerType = require('./countPerType');
const displays = require('./displays');


module.exports = {
    segments,
    requests,
    requestPerSite,
    responseTimePerServer,
    adEvents,
    adErrorBySite,
    requestForSite,
    currentLive,
    currentLivePerSite,
    viewsPerSite,
    streamsForLiveId,
    vodStatistics,
    aggregate,
    countPerType,
    displays
};
