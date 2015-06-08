/**
 * @file 从上游 logSessionId: logs 的结果中筛选有D点且D点大于给定阈值的logs组。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function (threshold) {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }

        cb(null, u.pick(data, function (entries, sessionId) {
            var perfAo = u.find(entries, function (entry) {
                if (entry.target === 'performance_ao_manual'
                    && entry.performance_ao_manual > threshold
                ) {
                    return true;
                }
                return false;
            });
            return perfAo != null;
        }));
    }); 
};

