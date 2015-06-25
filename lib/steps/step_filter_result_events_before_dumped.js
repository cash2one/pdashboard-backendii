/**
 * @file 从性能数据中，过滤掉有events-before-dumped内容的数据。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    var INDEX_BY_EXPR = require('../context').get('INDEX_BY_EXPR');
    var eventsBeforeDumpIndex = INDEX_BY_EXPR['performance_events_before_dumped.events'];
        
    return require('event-stream').map(function (data, cb) {
        if (eventsBeforeDumpIndex == null) {
            cb(null, data);
            return;
        }

        cb(null, u.pick(data, function (entries) {
            return entries[eventsBeforeDumpIndex] == null; 
        }));
    });
};

