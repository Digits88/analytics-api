module.exports = {
    default: true,
    development: false,
    production: false,
    staging: false,

    server: {
        port: 3000
    },

    log: {
        appenders: [{type: 'console'}]
    }
}