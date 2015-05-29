/**
 * @file 将data塞进数据库中。需要从context中拿以下内容
 *       1. dbUrl, 连接mongodb的url
 *       2. dbCollectionName, 放到哪个collection中
 * @author gushouchuang@baidu.com
 */

var q = require('q');
var u = require('underscore');
var context = require('../context');

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
        
        var recordTimestamp = context.get('recordTimestamp');
        var collectionName = context.get('collectionName');
        var keys = u.keys(data);
        var index = 0;
        
        function put_in_db_by_index (i) {
            if (i < keys.length) {
                var cname = keys[i];
                var cdata = data[cname];
                if (i === keys.length - 1) {
                    context.set('last_put', true);
                }
                context.set('dbCollectionName', collectionName[cname]);
                require('../db').doInDbCollection(processError, function (coll) {
                    var updatedData = cdata;
                    if (recordTimestamp != null) {
                        if (u.isArray(cdata)) {
                            updatedData = u.map(cdata, function (item) {
                                return u.extend(item, {
                                    recordTimestamp: recordTimestamp
                                });
                            });
                        }
                        else {
                            updatedData = u.extend(cdata, {
                                recordTimestamp: recordTimestamp
                            });
                        }
                    }
                    
                    return q.nfcall(u.bind(coll.insert, coll), updatedData)
                        .then(function (result) {
                            context.set('put_done', true);
                            if (context.get('last_put') === true) {
                                context.set('last_put', false);
                                context.set('put_done', false);
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
                if (context.get('put_done') === true) {
                    context.set('put_done', false);
                    index++;
                    put_in_db_by_index(index);
                }
                else {
                    setTimeout(function () {
                        check_flag();
                    }, 1000);
                }
            })();
        }
        put_in_db_by_index(index);
        
    });
};

