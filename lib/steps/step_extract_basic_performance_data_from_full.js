/**
 * @file 从以token为key，性能数据全集为value的上游数据中，拿取基本性能数据。
 * @author hanbingfeng@baidu.com
 */

var TARGETS = [
    'performance_static',
    'performance_materialList',
    'performance_accountTree',
    'performance_ao_manual'
];

var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }
        
        var ret = {};

        function putToResult(target, value) {
            if (ret[target] == null) {
                ret[target] = [value];
            }
            else {
                ret[target].push(value);
            }
        }

        u.each(data, function (entries) {
            u.each(entries, function (item) {
                if (u.contains(TARGETS, item.target)) {
                    putToResult(item.target, item[item.target]);
                }
            });
        });

        cb(null, ret);
    });
};

