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
            function clear_collection_in_db (i) {
                if (i < keys.length) {
                    var cname = keys[i];
                    var cdata = data[cname];
                    if (i === keys.length - 1) {
                        context.set('last_clear', true);
                    }
                    
                    context.set('dbCollectionName', collectionName[cname]);
                     require('../db').doInDbCollection(function (err) {
                        cb(err);
                    }, function (coll) {
                        return q.nfcall(u.bind(coll.remove, coll), {
                            recordTimestamp: recordTimestamp
                        })
                        .then(function () {
                            context.set('clear_done', true);
                            if (context.get('last_clear') === true) {
                                context.set('last_clear', false);
                                context.set('clear_done', false);
                                cb(null, data);
                            }
                        });
                    });
                }
                else {
                    return;
                }
                //定时器 检测上次入库完成否
                (function check_flag () {
                    if (context.get('clear_done') === true) {
                        context.set('clear_done', false);
                        index++;
                        clear_collection_in_db(index);
                    }
                    else {
                        setTimeout(function () {
                            check_flag();
                        }, 2000);
                    }
                })();
            }
            clear_collection_in_db(index);
        }
        else {
            cb(null, data);
        }
    });
};

