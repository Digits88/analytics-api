const ovp = require('../lib/support/ovp');


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

test("grants access to one site", () => {

    const ctx = {
        params: {
            siteId: '54af42d8-b41d-4efc-b355-38d879820184'
        },
        state: getTestState()
    };

    expect(ovp.getSites(ctx)).toBe('54af42d8-b41d-4efc-b355-38d879820184');
});

test("grants access to several sites", () => {
    const sites = ['54af42d8-b41d-4efc-b355-38d879820184', '95d09a82-cb4b-4d64-8c20-38b69a20fce9'];
    const ctx = {
        params: {
            siteId: sites
        },
        state: getTestState()
    };

    let result = ovp.getSites(ctx);
    expect(result).toContain('54af42d8-b41d-4efc-b355-38d879820184');
    expect(result).toContain('95d09a82-cb4b-4d64-8c20-38b69a20fce9');
});

test("prevents access to one site", () => {

    const ctx = {
        params: {
            siteId: 'forbidden-site'
        },
        state: getTestState()
    };

    expect(() => ovp.getSites(ctx)).toThrow();
});

