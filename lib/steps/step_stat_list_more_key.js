/**
 * @file 从上游拿 key: [] 对，统计数组中的平均值、50分位值、80分位值、95分位值
 *       接受一个外部threshold参数，大于等于threshold的数字不被统计
 * @author gushouchuang@baidu.com
 * 多键值
 */

var u = require('underscore');
var util = require('../common/util');

var context = require('../context');

var keyCollection = {
    'new': 'performance_keywordii_coreFunction',
    'old': 'performance_keyword_coreFunction'
};

function comparator(a, b) {
    return a - b;
}

exports.step = function (threshold) {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }
        
        var ret = {};
        //key -- new old两个version
        for (var key in data) {
            var cdata = data[key];
            if (ret[key] == null) {
                ret[key] = {};  
            }
            ret[key] = u.mapObject(cdata, function (list) {
                var orderedList = u.chain(list).filter(function (value) {
                    return value < threshold;
                }).map(function (value) {
                    return +value;
                }).sort(comparator).value();

                var ret = {};
                ret['count'] = orderedList.length;
                ret['average'] = util.fixed2Data(u.reduce(orderedList, function (memo, num) {
                    return memo + num;
                }, 0) / orderedList.length, 2);
                ret['50'] = util.fixed2Data(orderedList[Math.floor(orderedList.length / 2)], 2);
                ret['80'] = util.fixed2Data(orderedList[Math.floor(orderedList.length * 80 / 100)], 2);
                ret['95'] = util.fixed2Data(orderedList[Math.floor(orderedList.length * 95 / 100)], 2);
                return ret;
            })
        }
        //debugger  数据库去重的flag
        context.set('shouldCleanByRecordTimestamp', true);
        //扩展 new old
        context.set('collectionName', keyCollection);
        
        cb(null, ret);
    });
};

