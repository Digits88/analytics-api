const fs = require('fs');

const currentEnv = process.env.NODE_ENV || 'local';

function extend(a, b) {
    for (const x in b) a[x] = b[x];
}

// all configigs extend the default configig
const settings = require('./config/default');
if (currentEnv == 'production') {
    extend(settings, require('./config/production'));
} else if (currentEnv == 'stage') {
    extend(settings, require('./config/stage'));
} else if (currentEnv == 'dev') {
    extend(settings, require('./config/development'));
}

console.log("env is " + currentEnv + " isDev? " + settings.development);


try {
    const env = JSON.parse(fs.readFileSync('.env', 'ascii'));
    extend(settings, env);
} catch (err) {
// it's OK if the .env file does not exist
}
module.exports = settings;
