function base(payload) {
    return payload.activeLiveId.buckets.reduce(function (a, e) {
        a[e.key] = e.doc_count;
        return a;
    }, {});
}

module.exports = {
    base
};
