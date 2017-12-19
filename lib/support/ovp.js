module.exports.getSiteGroupId = function (ctx) {
    if (!ctx.state) throw new Error("ctx.state not available");
    if (!ctx.state.ovp) throw new Error("ctx.state.ovp not available");
    return ctx.state.ovp.siteGroupId;
};

function hasSiteAccess(ctx, id) {
    return ctx.state.ovp.sites.find(function (site) {
        return site.id === id;
    });
}

function throwError(status, msg) {
    let e = new Error(msg);
    e.status = status;
    throw e;
}

module.exports.getSites = function (ctx) {
    if (!ctx.query) return null;
    let param = ctx.query.siteId;
    if (!param) return null;

    if (!Array.isArray(param)) {
        param = [param];
    }
    const hasAccess = param.reduce(function (current, id) {
        return current && hasSiteAccess(ctx, id);
    }, true);
    if (!hasAccess) return throwError(404, "Not found");

    return ctx.query.siteId;
};