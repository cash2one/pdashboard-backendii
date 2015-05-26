/**
 * @file 去掉获取性能日志期间有其他操作的用户
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
        
        var left = u.filter(logData, function (item) {
            return !(u.contains([
                'NIRVANA_PAGE_LOAD',
                'performance_materialList',
                'performance_materialList_process',
                'performance_ao_manual',
                'performance_static',
                'performance_accountTree',
                'ajaxLog',
                'timeline'
            ], item.target));
        });

        if (left.length > 0) {
            cb(null, null);
        }
        else {
            cb(null, data);
        }
    });
};
