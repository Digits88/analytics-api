const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

function validator(checkBody) {
    return function validatorMiddleware(cb) {
        let schema = cb(Joi);
        return (ctx, next) => {
            const result = Joi.validate(checkBody ? ctx.request.body : ctx.query, schema, {abortEarly: false});
            if (!result.error) return next();
            ctx.body = {
                message: 'Input validation failed',
                errors: result.error.details
            };
            ctx.status = 400;
        };
    }
}

module.exports.body = validator(true);
module.exports.params = validator(false);
