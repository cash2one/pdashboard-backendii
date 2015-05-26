/**
 * @file 从上游数据拿timeline信息，用context中的"targetPath"做过滤
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
        var ret = u.chain(logData)
            .filter(function (item) {
                var isTargetPath = targetPath != null ?
                    item.path.indexOf(targetPath) >= 0
                    : true;
                var isValidTimeline = true;
                u.find([
                    'performance_static_er_inited',
                    'performance_manage_load_materiallist',
                    'performance_manage_account_tree_displayed',
                    'performance_manage_ao_manual_finished',
                    'performance_manage_initbehavior'
                ], function (key) {
                    isValidTimeline = isValidTimeline && u.has(item, key);
                    return !isValidTimeline;
                });
                return isValidTimeline && isTargetPath && item.target === 'timeline';
            })
            .map(function (item) {
                return u.pick(item, function (value, key) {
                    return key.indexOf('performance_') === 0;
                });
            })
            .value();
        cb(null, ret[0]);
    });
};

