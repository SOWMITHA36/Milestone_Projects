const path = require("path");
require("dotenv-safe").config({
    allowEmptyValues: true,
    path: path.join(__dirname, "../../.env.example"),
});
module.exports = {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    mongo_db_uri : process.env.MONGO_DB_CONNECTION_STRING,
    domain : process.env.DOMAIN,
    apikey : process.env.APIKEY
};
