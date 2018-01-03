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
    expect(resp.status).toBe(200);
});

it("should return 404 when querying some other user's video", async () => {
    const resp = await request("get", "/videos/011e6af6-1b4b-40c1-9e23-d023dbb05d7f", null, {
        start: '2017-12-01T00',
        end: '2017-12-10T00'
    });
    console.log(resp.body);
    expect(resp.status).toBe(404);
});

/*
 * ======================
 *  Current viewers
 * ======================
 */

it('should get current viewers', async () => {
    const resp = await request("get", "/viewers", null);
    console.log(resp.body);
    expect(resp.status).toBe(200);
});

it('should get current viewers for the specified video', async () => {
    const resp = await request("get", "/viewers?id=360b8f49-3c98-4020-ac72-83f958405239", null);
    console.log(resp.body);
    expect(resp.status).toBe(200);
});

it('should return 404 for current viewers for other users video', async () => {
    const resp = await request("get", "/viewers?id=011e6af6-1b4b-40c1-9e23-d023dbb05d7f", null);
    console.log(resp.body);
    expect(resp.status).toBe(404);
});

it('should get current viewers for two videos', async () => {
    const resp = await request("get", '/viewers?id=["360b8f49-3c98-4020-ac72-83f958405239","00048d7e-7ffb-46ee-ae21-e49b3668fea8"]', null);
    console.log(resp.body);
    expect(resp.status).toBe(200);
});

it('should return 404 for current viewers when one unknown video specified', async () => {
    const resp = await request("get", '/viewers?id=["360b8f49-3c98-4020-ac72-83f958405239","011e6af6-1b4b-40c1-9e23-d023dbb05d7f"]', null);
    console.log(resp.body);
    expect(resp.status).toBe(404);
});

it('should return not found for unknown site', async () => {
    const resp = await request("get", "/viewers?siteId=123", null);
    console.log(resp.body);
    expect(resp.status).toBe(404);
});


/*
 * ===========================
 * Current viewers per video
 * ===========================
 */

it('should return videos with viewer counts', async () => {
    const resp = await request("get", "/viewers/videos", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});

it('should return videos with viewer counts for a specific site', async () => {
    const resp = await request("get", "/viewers/videos?siteId=54af42d8-b41d-4efc-b355-38d879820184", null);
    console.log(resp.body);
    expect(resp.status).toBe(200);
});

it('should return 404 for an unknown site', async () => {
    const resp = await request("get", "/viewers/videos?siteId=666", null);
    console.log(resp.body);
    expect(resp.status).toBe(404);
});


/*
 * ======================
 *       Intervals
 * ======================
 */

it('should get default interval', async () => {
    const resp = await request("get", "/intervals", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});

it('should get hourly stats for three hours, comparing them to the previous three hours', async () => {
    const resp = await request("get", "/intervals?start=2017-12-01T00&end=2017-12-01T03", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});

it('should get month interval', async () => {
    const resp = await request("get", "/intervals?interval=month", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});

it('should get interval', async () => {
    const resp = await request("get", "/intervals?start=2017-12-01&end=2017-12-17", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
    expect(resp.body.length).toBe(2); // 2 intervals
});

it('should get interval without previous', async () => {
    const resp = await request("get", "/intervals?start=2017-11-01&end=2017-12-17&previous=false", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
    expect(resp.body.length).toBe(1);
});

it('should get interval for a specific site', async () => {
    const resp = await request("get", "/intervals?start=2017-12-01&end=2017-12-17&previous=false&siteId=54af42d8-b41d-4efc-b355-38d879820184", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
    expect(resp.body.length).toBe(1);
});

it('should get interval for a specific video', async () => {
    const resp = await request("get", "/intervals?start=2017-12-01&end=2017-12-17&previous=false&id=00048d7e-7ffb-46ee-ae21-e49b3668fea8", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
    expect(resp.body.length).toBe(1);
});

/*
 * ======================
 *       Views
 * ======================
 */

it('should return views', async () => {
    const resp = await request("get", "/views", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);

    const views = resp.body;
    expect(views.length).toBe(10);
});

it('should return 404 for an unknown site', async () => {
    const resp = await request("get", "/views?siteId=123", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(404);
});

it('should return views for a specific site', async () => {
    const resp = await request("get", "/views?siteId=54af42d8-b41d-4efc-b355-38d879820184&size=3&start=2017-12-01&end=2017-12-24", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});

it('should return views for a specific video', async () => {
    const resp = await request("get", "/views?id=360b8f49-3c98-4020-ac72-83f958405239", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});

/*
 * ======================
 *  Live: casts
 * ======================
 */

it('should return live stats', async () => {
    const resp = await request("get", "/live/casts", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);

});

it('should return live stats for a specific site', async () => {
    const resp = await request("get", "/live/casts?siteId=e426f62e-c59c-4820-a3e2-83e33a79f65d", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);

});

it('should return live stats for a specific live cast ID', async () => {
    const resp = await request("get", "/live/casts?id=a84c6ba2-54cb-4e09-bfb8-20eb9f68c814", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);

});

/*
 * ======================
 *  Live: summary
 * ======================
 */

it('should return a live summary', async () => {
    const resp = await request("get", "/live/summary", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});

it('should return a summary for a specified site', async () => {
    const resp = await request("get", "/live/summary?siteId=e426f62e-c59c-4820-a3e2-83e33a79f65d", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});

it('should return a summary for a specified live ID', async () => {
    const resp = await request("get", "/live/summary?id=a84c6ba2-54cb-4e09-bfb8-20eb9f68c814", null);
    console.log(JSON.stringify(resp.body, null, "\t"));
    expect(resp.status).toBe(200);
});
