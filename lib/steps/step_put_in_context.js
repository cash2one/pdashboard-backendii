/**
 * @file 操作context区，将上游拿到的内容的key-value对放到context的results区
 *       下游原样返回data。
 * @author hanbingfeng@baidu.com
 */

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var u = require('underscore');
        var context = require('../context');
        var results = context.get('results');
        if (results == null) {
            results = {};
            context.set('results', results);
        }

        u.each(data, function (value, key) {
            if (results[key] == null) {
                results[key] = [];
            }
            if (u.isArray(value)) {
                results[key] = results[key].concat(u.flatten(value));
            }
            else {
                results[key].push(value);
            }
        });
        cb(null, data);
    });
};

