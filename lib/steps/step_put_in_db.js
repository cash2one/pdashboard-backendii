/**
 * @file 将data塞进数据库中。需要从context中拿以下内容
 *       1. dbUrl, 连接mongodb的url
 *       2. dbCollectionName, 放到哪个collection中
 * @author hanbingfeng@baidu.com
 */

var q = require('q');
var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        function processError(err) {
            console.error(err.stack);
            cb(err);
        }
        
        if (data == null) {
            cb(null, null);
            return;
        }

        require('../db').doInDbCollection(processError, function (coll) {
            var recordTimestamp = require('../context').get('recordTimestamp');
            var updatedData = data;
            if (recordTimestamp != null) {
                if (u.isArray(data)) {
                    updatedData = u.map(data, function (item) {
                        return u.extend(item, {
                            recordTimestamp: recordTimestamp
                        });
                    });
                }
                else {
                    updatedData = u.extend(data, {
                        recordTimestamp: recordTimestamp
                    });
                }
            }

            return q.nfcall(u.bind(coll.insert, coll), updatedData)
                .then(function (result) {
                    cb(null, data);
                });
        });
    });
};

