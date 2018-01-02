const config = require('../config');

function getTestState() {
    return {
        // ovp: {
        //     // siteGroupId: 'cdc27245-d38c-462f-801b-e1330e9c8fe0',
        //     sites: [
        //         {id: '54af42d8-b41d-4efc-b355-38d879820184'},
        //         {id: '95d09a82-cb4b-4d64-8c20-38b69a20fce9'}
        //     ]
        // },
        /* for live */
        ovp: {
            siteGroupId: '83f9b613-c7c9-4003-bf29-2a7967d2668e',
            sites: [
                {id: 'e426f62e-c59c-4820-a3e2-83e33a79f65d'},
                {id: 'b8bb09c1-fa63-4702-a3e5-bb4107f3344e'}
            ]
        },
        user: {
            flowplayer_id: 3,
            id: '44a4efaa-7fb3-4498-9571-06b9fe6b6841'
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
