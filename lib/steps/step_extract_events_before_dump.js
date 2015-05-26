/**
 * @file 找出events_before_dump 的条目
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
        var targetPath = require('../context').get('targetPath');
        var eventsBeforeDumped = u.find(logData, function (item) {
            return item.target === 'performance_events_before_dumped';
        });
        if (eventsBeforeDumped) {
            console.log(eventsBeforeDumped);
        }

        cb(null, data);
    });
};

