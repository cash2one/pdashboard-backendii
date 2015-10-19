/**
 * @file
 * @author wujianwei01@baidu.com
 *
 */
var mongo = require('mongodb');

/**
 * 连接mongodb
 * @param {string} url mongo地址
 * @return {Promise} 
 */
exports.connectDb = function (url) {
    return new Promise(function (resolve, reject) {
        mongo.MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            else {
                resolve(db);
            }
        })
    });
}
