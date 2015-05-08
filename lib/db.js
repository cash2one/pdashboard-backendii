/**
 * @file 连接DB的工具，打开db连接并处理其关闭
 *       自动从context里面拿dbUrl和dbCollectionName两个属性。
 * @author hanbingfeng@baidu.com
 */

var q = require('q');

exports.doInDb = function (errCb, cb) {
    var MongoClient = require('mongodb').MongoClient;
    var url = require('./context').get('dbUrl');

    MongoClient.connect(url, function (err, db) {
        if (err != null) {
            errCb(err);
            return;
        }

        cb(db)
        .fail(function (result) {
            errCb(result);
        })
        .fin(function () {
            db.close();
        });
    });
}

exports.doInDbCollection = function (errCb, cb) {
    exports.doInDb(errCb, function (db) {
        var collectionName = require('./context').get('dbCollectionName');
        var coll = db.collection(collectionName);
        return cb(coll);
    });
}; 
