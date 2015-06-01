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
		var keyLength = keys.length;
        // context.set('keylength', keys.length);
		
        (function put_in_db_by_index (i) {
            if (i < keyLength) {
                var cname = keys[i];
                var cdata = data[cname];
               
                context.set('dbCollectionName', collectionName[cname]);
                // context.set('index', i);
                
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
                            // var index = context.get('index');
                            // var keyLength = context.get('keylength');
							var index = i;
							console.log(keyLength);
							console.log(index);
                            if (index === keyLength - 1) {
                                cb(null, data);
                            }
                            else {
                                put_in_db_by_index(++index);
                            }
                        });
                });
            }
            else {
                return;
            }
        })(index);
        
    });
};