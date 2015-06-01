/**
 * @file 从上游timeline数据中过滤long ao
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var INDEX_BY_EXPR = require('../context').get('INDEX_BY_EXPR');
        
        cb(null, u.pick(data, function (entries) {
            var ao = entries[INDEX_BY_EXPR['performance_ao_manual']];
            if (ao != null && +ao > 15000) {
                return true;
            }
            return false;
        }));
    });
};
