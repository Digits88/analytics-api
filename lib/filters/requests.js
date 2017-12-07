function base(payload) {
    return payload.byTime.buckets.map(function (e) {
        return {
            t: e.key,
            c: e.doc_count
        };
    });
}

module.exports = {
    base
};
