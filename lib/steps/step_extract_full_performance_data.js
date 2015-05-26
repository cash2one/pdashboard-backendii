/**
 * @file 从上游数据拿取性能信息，包括ABCD四个点，timeline信息和events_before_dumped信息，以token为key放到context中
 *       可选的，从context中拿取targetPath属性，只选取targetPath指定的path的数据
 * @author hanbingfeng@baidu.com
 */

var TARGETS = [
    'performance_static',
    'performance_materialList',
    'performance_accountTree',
    'performance_ao_manual',
    'timeline',
    'performance_events_before_dumped'
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
        var entries = u.filter(logData, function (item) {
            var isTargetPath = targetPath != null ?
                item.path.indexOf(targetPath) >= 0
                : true;
            return isTargetPath && u.contains(TARGETS, item.target);
        });
        var ret = null;
        if (entries.length) {
            ret = {};
            ret[data.token] = entries;
        }
        cb(null, ret);
    });
};

