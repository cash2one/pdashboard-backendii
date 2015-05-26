/**
 * @file 过滤某些events before dumped
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        cb(null, u.pick(data, function (entries, key) {
            // 查找events before dumped entry
            var eventsBeforeDumped = u.find(entries, function (item) {
                return item.target === 'performance_events_before_dumped';
            });
            if (eventsBeforeDumped == null) {
                return true;
            }
            var events = eventsBeforeDumped.events;
            events = events.split('|');
            events = u.filter(events, function (event) {
                // 筛掉一些可以有的
                if (event.length) {
                    switch (event.split(',')[0]) {
                        case 'dropdownadvancedsettings':
                            return false;
                        default:
                            return true;
                    }
                }
                else {
                    return false;
                }
            });
            if (events.length) {
                return false;
            }
            else {
                return true;
            }
        }));
    });
};
