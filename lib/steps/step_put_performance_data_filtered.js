/**
 * @file 向context中放置性能数据，根据一些条件做筛除：
 *  1.  有events_before_dumped，默认放在perfData数组第一个
 * @author hanbingfeng@baidu.com
 */
 
var u = require('underscore');
var context = require('../context');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var results = context.get('results');
        var INDEX_BY_EXPR = context.get('INDEX_BY_EXPR');
        if (data == null) {
            cb(null, null);
            return;
        }

        if (results == null) {
            results = {};
            context.set('results', results);
        }

        u.each(data, function (perfData, perfId) {
            var existing = results[perfId];
            if (existing != null) {
                // merge 2 arrays
                for (var i = 0; i < Math.max(existing.length, perfData.length); i++) {
                    existing[i] = existing[i] || perfData[i];
                }
            }
            else {
                results[perfId] = perfData;
            }
        });
        cb(null, data);
    });
};

