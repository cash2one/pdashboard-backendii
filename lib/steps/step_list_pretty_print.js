/**
 * @file 输出上游送来的performance data，从pipeline配置中读参数。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function (exprs) {
    return require('event-stream').map(function (data, cb) {
        var ret = '';
        var INDEX_BY_EXPR = require('../context').get('INDEX_BY_EXPR');
        u.each(data, function (entries) {
            u.each(exprs, function (expr) {
                ret += expr + '\t' + entries[INDEX_BY_EXPR[expr]] + '\n';
            });
            ret += '\n';
        });
        cb(null, ret);
    });
};

