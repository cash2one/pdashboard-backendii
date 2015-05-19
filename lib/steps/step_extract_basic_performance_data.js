/**
 * @file 从上游数据拿取基本性能信息，包括ABCD四个点。
 *       可选的，从context中拿取targetPath属性，只选取targetPath指定的path的数据
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
        var targetPath = require('../context').get('targetPath');
        cb(null, u.chain(logData)
            .filter(function (item) {
                var isTargetPath = targetPath != null ?
                    item.path.indexOf(targetPath) >= 0
                    : true;
                return isTargetPath && u.contains(TARGETS, item.target);
            })
            .indexBy('target')
            .each(function (item, key, map) {
                map[key] = item[key];
            })
            .value()
        );
    });
};

