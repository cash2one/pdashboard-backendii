/**
 * @file 过滤上游的分组的logData，对每一组，拿每个log entry的一些属性。
 *       属性名字从context的logProperties拿取。
 * @author hanbingfeng@baidu.com
 */
var u = require('underscore');

exports.step = function () {
    var props = require('../context').get('logProperties');
    return require('event-stream').map(function (data, cb) {
        var ret = {};
        u.each(data, function (logEntries, groupName) {
            var entries = ret[groupName] = [];
            u.each(logEntries, function (entry) {
                entries.push(u.pick(entry, props));
            });
        });
        cb(null, ret);
    });
};

