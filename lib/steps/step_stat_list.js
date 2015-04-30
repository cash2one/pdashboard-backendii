/**
 * @file 从上游拿 key: [] 对，统计数组中的平均值、50分位值、80分位值、95分位值
 *       接受一个外部threshold参数，大于等于threshold的数字不被统计
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

function comparator(a, b) {
    return a - b;
}

exports.step = function (threshold) {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }

        cb(null,
            u.mapObject(data, function (list) {
                var orderedList = u.chain(list).filter(function (value) {
                    return value < threshold;
                }).map(function (value) {
                    return +value;
                }).sort(comparator).value();

                var ret = {};
                ret['count'] = orderedList.length;
                ret['average'] = u.reduce(orderedList, function (memo, num) {
                    return memo + num;
                }, 0) / orderedList.length;
                ret['50'] = orderedList[Math.floor(orderedList.length / 2)];
                ret['80'] = orderedList[Math.floor(orderedList.length * 80 / 100)];
                ret['95'] = orderedList[Math.floor(orderedList.length * 95 / 100)];
                return ret;
            })
        );
    });
};

