/**
 * @file 从上游数据拿取基本性能信息，包括ABCD四个点。
 * @author hanbingfeng@baidu.com
 */

var TARGETS = [
    'performance_static',
    'performance_materialList',
    'performance_accountTree',
    'performance_ao_manual'
];

var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }
        var logData = data.logData || data;
        cb(null, u.chain(logData)
            .filter(function (item) {
                return u.contains(TARGETS, item.target);
            })
            .indexBy('target')
            .each(function (item, key, map) {
                map[key] = item[key];
            })
            .value()
        );
    });
};

