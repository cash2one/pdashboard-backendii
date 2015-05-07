/**
 * @file 计算便捷管理页的性能指标
 * @author hanbingfeng@baidu.com
 */

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var ret = {};
        if (data.target === 'performance_static') {
            ret[data.target] = data.performance_static;
        }
        else {
            ret[data.target] = +data.timestamp - +data.tc0;
        }
        cb(null, ret);
    });
};

