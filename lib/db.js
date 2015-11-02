/**
 * @file 连接DB的工具，打开db连接并处理其关闭
 *       自动从context里面拿dbUrl和dbCollectionName两个属性。
 * @author hanbingfeng@baidu.com
 */

var q = require('q');
var u = require('underscore');

exports.doInDb = function (errCb, cb) {
    var MongoClient = require('mongodb').MongoClient;
    var url = require('./context').get('dbUrl');
    var u = require('underscore');

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
};

exports.doInDbCollection = function (errCb, cb) {
    exports.doInDb(errCb, function (db) {
        var collectionName = require('./context').get('dbCollectionName');
        var coll = db.collection(collectionName);
        return cb(coll);
    });
}; 

/**
 * 处理edp webserver来的请求。
 * @param {string} dbUrl
 */
exports.request = function () {
    return function (context) {
        context.header['content-type'] = 'application/json;charset=UTF-8';

        var req = context.request;
        var query = req.query;

        if (u.has(query, 'params')) {
            try {
                u.extend(query, JSON.parse(query.params));
            }
            catch (ex) {
                console.error('parse JSON error', ex);
            }
        }
        console.log('got query ', JSON.stringify(query, null, 4));

        if (query.path == null) {
            context.status = 400;
            context.content = '{"error":"missing path"}';
            return;
        }
        else if (query.dbCollectionName == null) {
            context.status = 400;
            context.content = '{"error":"missing dbCollectionName"}';
            return;
        }
        
        var dbQuery = {};

        if (query.dbQuery != null) {
            try {
                dbQuery = JSON.parse(query.dbQuery);
            }
            catch (ex) {
                context.status = 400;
                context.content = '{"error":"invalid dbQuery request"}';
                return;
            }
        }

        context.stop();

        exports.doInDb(function (err) {
            context.content = '{"error": "' + err.toString() + '"}';
            context.status = 500;
            console.error(err);
            context.start();
        }, function (db) {
            return q.Promise(function (resolve, reject) {
                var coll = db.collection(query.dbCollectionName);
                coll.find(dbQuery).toArray(function (error, documents) {
                    if (error != null) {
                        context.status = 500;
                        context.content = JSON.stringify({error: error.toString()});
                    }
                    else {
                        context.status = 200;
                        context.content = JSON.stringify(documents);
                    }
                    context.start();
                    resolve();
                });
            });
        });
    };
};

