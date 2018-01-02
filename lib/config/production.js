module.exports = {
    default: false,
    development: false,
    production: true,
    staging: false,

    server: {
        port: 3000
    },

    log: {
        appenders: [{type: 'console'}]
    },

    elasticsearch: {
        url: ["http://search-lw-eu-w1-statistics-nbsa4qn4axoa2cy6ykzzjom3pa.eu-west-1.es.amazonaws.com"],
        liveIndex: "live_stat_entry",
        vodIndex: "u_shipper_i0",
        index: "stat_entry_test",
        segmentIndex: "vod_stat",
        client_add_options: {
            log: "info",
            keepAlive: true,
            minSockets: 5,
            maxSockets: 20
        }
    }
}