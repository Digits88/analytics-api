const config = require('../config');

function getTestState() {
    return {
        ovp: {
            siteGroupId: 'cdc27245-d38c-462f-801b-e1330e9c8fe0',
            sites: [
                {id: '54af42d8-b41d-4efc-b355-38d879820184'},
                {id: '95d09a82-cb4b-4d64-8c20-38b69a20fce9'}
            ]
        },
        user: {
            flowplayer_id: 3
        }
    };
};

module.exports = async (ctx, next) => {
    console.log("ovp.middleware: " + ctx.request.url);

    if (!ctx.state.ovp && !config.production) {

        ctx.state = getTestState();
        return await next();
    }
    await next();
};
