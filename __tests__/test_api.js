const supertest = require('supertest');
const app = supertest(require('../server.js'));

jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;


function request(method, url, data, query) {
    if (!method) throw new Error("Method needs to be specified, one of get, post, put, delete");
    return new Promise((resolve, reject) => {
        app
            [method](url)
            .send(data)
            .query(query)
            .end((err, res) => {
                console.log("body:----------");
                console.log(JSON.stringify(res.body));

                if (err) {
                    console.log(JSON.stringify(err.message));
                    console.log(JSON.stringify(err.stack));

                    return resolve(err);
                }
                if (!res.ok) {
                    console.log(JSON.stringify(res.error));
                    console.log(JSON.stringify(res.text));
                    resolve(res.error);
                } else {
                    resolve(res);
                }
            });
    });
}

it('should get video stats', async () => {
    const resp = await request("get", "/videos/360b8f49-3c98-4020-ac72-83f958405239", null, {
        start: '2017-12-01T00',
        end: '2017-12-10T00'
    });
    // const resp = await request("get", "/videos/360b8f49-3c98-4020-ac72-83f958405239");
    console.log(resp.body);
});


it('should get current viewers', async () => {
    const resp = await request("get", "/current", null);
    console.log(resp.body);
});

it('should get current viewers for the specified video', async () => {
    const resp = await request("get", "/current?id=360b8f49-3c98-4020-ac72-83f958405239", null);
    console.log(resp.body);
});

it('should get current viewers for two videos', async () => {
    const resp = await request("get", "/current?id=[360b8f49-3c98-4020-ac72-83f958405239,00048d7e-7ffb-46ee-ae21-e49b3668fea8]", null);
    console.log(resp.body);
});

it('should return not found for unknown site', async () => {
    const resp = await request("get", "/current?siteId=123", null);
    console.log(resp.body);
    expect(resp.status).toBe(404);
});

it('should get interval', async () => {
    const resp = await request("get", "/interval", null);
    // const resp = await request("get", "/videos/360b8f49-3c98-4020-ac72-83f958405239");
    console.log(resp.body);
});
