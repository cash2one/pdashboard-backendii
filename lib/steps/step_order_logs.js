/**
 * @file 将上游logSessionId: logs的数组按timestamp排序
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }
        
        u.each(data, function (value, key, map) {
            map[key] = u.sortBy(value, 'timestamp');
        });

        cb(null, data);
    });
};
