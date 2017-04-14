/**
 * Created by Changeden on 2017/3/17
 */
const mysql = require('mysql');
let config = require('../bin/config.json');

/**连接数据库*/
function connectServer(name) {
    name = name || 'default';
    var db = config.database[name];
    if (!db) {
        db = config.database['default'];
    }
    var client = mysql.createConnection({
        host: db.host,
        user: db.user,
        password: db.password,
        database: db.database
    });
    return client;
}
module.exports = mysql;
module.exports.connectServer = connectServer;