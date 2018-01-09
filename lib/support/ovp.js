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

/*
 * Gets a list of sites from ctx.query (request param siteId, which can be repeated)
 * Throws an error if the query has a site that the user does not have access to (is not in ctx.state)
 */

module.exports.getQuerySites = function (ctx) {
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

/*
 * Get user's sites (from ctx.state)
 */
module.exports.getSiteIds = function (ctx) {
    if (!ctx.state) throw new Error("ctx.state not available");
    if (!ctx.state.ovp) throw new Error("ctx.state.ovp not available");
    return ctx.state.ovp.sites.map(function (site) {
        return site.id;
    });
};

/*
 * Get the user ID (from ctx.state)
 */
module.exports.getUserId = function (ctx) {
    if (!ctx.state && ctx.state.user) return null;
    return ctx.state.user.id;
};