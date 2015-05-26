/**
 * @file 拣出AO指标不正常的timeline
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
                var isLongAo = u.has(item, 'performance_manage_ao_manual_finished')
                    && +item.performance_manage_ao_manual_finished > 20000;
                return !item.iframeShowed && isLongAo && isTargetPath && item.target === 'timeline';
            })
            .map(function (item) {
                return u.pick(item, function (value, key) {
                    return key.indexOf('performance_') === 0;
                });
            })
            .value();
        ret[0].userid = data.userid;
        cb(null, ret[0]);
    });
};

