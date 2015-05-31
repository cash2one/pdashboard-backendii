/**
 * @file 从以performanceId为key，性能数据数组为值的上游数据中，拿取基本性能数据。
 *      从pipeline配置中拿取targets。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');
var context = require('../context');
var INDEX_BY_TARGET = context.get('INDEX_BY_TARGET');

exports.step = function (targets) {
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
            u.each(targets, function (target) {
                var value = entries[INDEX_BY_TARGET[target]];
                if (value != null) {
                    putToResult(target, value);
                }
            });
        });

        cb(null, ret);
    });
};

