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
        var timeline = u.find(logData, function (item) {
            return item.target === 'timeline';
        });
        if (timeline) {
            if (
                u.has(timeline, 'performance_manage_ao_manual_start')
                && u.has(timeline, 'performance_manage_ao_manual_finished')
                && +(timeline.performance_manage_ao_manual_finished) > 20000
//                && +(timeline.performance_manage_ao_manual_finished) - +(timeline.performance_manage_ao_manual_start) > 10000
//                && +(timeline.performance_static_er_inited) > 10000
                && +(timeline.performance_manage_load_materiallist) - +(timeline.performance_manage_beforemodelload) > 10000
                && !timeline.iframeShowed
            ) {
                var left = u.filter(logData, function (item) {
                    return !(u.contains([
                        'NIRVANA_PAGE_LOAD',
                        'performance_materialList',
                        'performance_materialList_process',
                        'performance_ao_manual',
                        'performance_static',
                        'performance_accountTree',
                        'ajaxLog',
                        'ajaxFailLog',
                        'timeline'
                    ], item.target));
                });
                if (left.length > 0) {
                    data.didSomething = left.length;
                }
                cb(null, data);
            }
            else {
                cb(null, null);
            }
        }
        else {
            cb(null, null);
        }
    });
};

