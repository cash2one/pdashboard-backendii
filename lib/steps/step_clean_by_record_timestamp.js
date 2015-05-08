/**
 * @file 将数据库中拥有相同recordTimestamp的数据抹掉。从context中拿recordTimestamp，以及：
 *       1. dbUrl, 连接mongodb的url
 *       2. dbCollectionName, 放到哪个collection中
 *       3. shouldCleanByRecordTimestamp, boolean, 控制这个step是否生效
 * @author hanbingfeng@baidu.com
 */
var q = require('q');
var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var recordTimestamp = require('../context').get('recordTimestamp');
        var shouldCleanByRecordTimestamp = require('../context').get('shouldCleanByRecordTimestamp');
        if (recordTimestamp != null && shouldCleanByRecordTimestamp) {
            require('../db').doInDbCollection(function (err) {
                cb(err);
            }, function (coll) {
                return q.nfcall(u.bind(coll.remove, coll), {
                    recordTimestamp: recordTimestamp
                })
                .then(function () {
                    cb(null, data);
                });
            });
        }
        else {
            cb(null, data);
        }
    });
};

