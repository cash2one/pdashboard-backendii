/**
 * @file 将数据库中拥有相同recordTimestamp的数据抹掉。从context中拿recordTimestamp，以及：
 *       1. dbUrl, 连接mongodb的url
 *       2. dbCollectionName, 放到哪个collection中
 *       3. shouldCleanByRecordTimestamp, boolean, 控制这个step是否生效
 * @author gushouchuang@baidu.com
 * 多键值
 */
var q = require('q');
var u = require('underscore');
var context = require('../context');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var recordTimestamp = context.get('recordTimestamp');
        var shouldCleanByRecordTimestamp = require('../context').get('shouldCleanByRecordTimestamp');
 
        var collectionName = context.get('dbCollectionName');
        var keys = u.keys(data); // key -- new old两个version
        var index = 0;
        var keyLength = keys.length;

        if (recordTimestamp != null && shouldCleanByRecordTimestamp) {
            (function clear_collection_in_db (index) {
                if (index < keyLength) {
                    var cname = keys[index];
                    var cdata = data[cname];

                    context.set('dbCollectionName', collectionName[cname]);
                    
                    require('../db').doInDbCollection(function (err) {
                        cb(err);
                    }, function (coll) {
                        return q.nfcall(u.bind(coll.remove, coll), {
                            recordTimestamp: recordTimestamp
                        })
                        .then(function () {
                        
                            if (index === keyLength - 1) {
                                cb(null, data);
                            }
                            else {
                                clear_collection_in_db(++index);
                            }
                        });
                    });
                }
                else {
                    return;
                }
            })(index);
        }
        else {
            cb(null, data);
        }
    });
};