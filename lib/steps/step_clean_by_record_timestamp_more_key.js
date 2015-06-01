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
 
        var collectionName = context.get('collectionName');
        var keys = u.keys(data); // key -- new old两个version
        var index = 0;
        if (recordTimestamp != null && shouldCleanByRecordTimestamp) {
            (function clear_collection_in_db (i) {
                if (i < keys.length) {
                    var cname = keys[i];
                    var cdata = data[cname];
                    if (i === keys.length - 1) {
                        context.set('last_clear', true);
                    }

                    context.set('dbCollectionName', collectionName[cname]);
                    context.set('index', i);
                    context.set('keylength', keys.length);
                    
                     require('../db').doInDbCollection(function (err) {
                        cb(err);
                    }, function (coll) {
                        return q.nfcall(u.bind(coll.remove, coll), {
                            recordTimestamp: recordTimestamp
                        })
                        .then(function () {
                            var index = context.get('index');
                            var keyLength = context.get('keylength');
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