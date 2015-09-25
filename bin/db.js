/**
 * @file
 * @author wujianwei01@baidu.com
 *
 */
var mongo = require('mongodb');

exports.connectDb = function (url) {
    return new Promise(function (resolve, reject) {
        mongo.MongoClient.connect(url, function (err, db) {
            if (err) {
                reject(err);
            }
            else {
                resolve(db);
            }
            // db.close();
        })
    });
}


/**
 * 根据记录的时间戳删除对应的collection，然后插入新的collection
 * @param {Object} db mongodb 
 * @param {string} dbcoll 需要存入的collection 名
 * @param {Object} document 需要存入的数据集
 */

exports.insertDataInDb = function (db, dbcoll, document) {
    var coll = db.collection(dbcoll);
    coll.remove({recordTimestamp: document.recordTimestamp}, function (err, result) {
        coll.insert([document], function (err, result) {
        })
    });
}

exports.resolveDataInDb = function (db, dbcoll, document) {
    return new Promise(function (resolve, reject) {
        var coll = db.collection(dbcoll);
        // console.log(dbcoll);
        coll.remove({recordTimestamp: document.recordTimestamp}, function (err, result) {
            if (err) {
                reject();
            }
            coll.insert([document], function (err, result) {
                if (err) {
                    reject();
                }
                resolve();
            });
        });
    });
}
