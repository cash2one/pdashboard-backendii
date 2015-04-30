/**
 * @file 从上游拿到的json的logData中，过滤一组target并分组送给下游
 *       关心的targets从context的targets属性中拿取。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }

        var logData = data.logData || data;
        var targets = require('../context').get('targets');

        var ret = {};
        u.each(logData, function (logEntry) {
            if (u.contains(targets, logEntry.target)) {
                if (ret[logEntry.target] == null) {
                    ret[logEntry.target] = [logEntry];
                }
                else {
                    ret[logEntry.target].push(logEntry);
                }
            }
        });
        cb(null, ret);
    });
};

