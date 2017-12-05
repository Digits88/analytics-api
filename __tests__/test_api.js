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

                    return reject(err);
                }
                if (!res.ok) {
                    console.log(JSON.stringify(res.error));
                    console.log(JSON.stringify(res.text));
                    reject(res.error);
                } else {
                    resolve(res);
                }
            });
    });
}


it('should get video stats', async () => {
    const resp = await request("get", "/videos/10");
    console.log(resp.body);
});
