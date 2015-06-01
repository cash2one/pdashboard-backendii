/**
 * @file 从上游数据拿取性能信息，拿取pipeline配置中指定的性能属性。属性由点表达式表示。
 *      “<target>.<property>”。
 *      取到的值按照pipeline配置中给定的顺序放入数组。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');
var context = require('../context');
var globalId = 0;

function getByDotExpr(obj, expr) {
    var value = obj;
    u.find(expr.split('.'), function (key) {
        value = value[key];
        return value == null;
    });
    return value;
}

exports.step = function (targets) {
    var TARGETS = [];
    var INDEX_BY_TARGET = {};
    u.each(targets, function (target, index) {
        var t = target.substring(0, target.indexOf('.'));
        TARGETS.push(t);
        INDEX_BY_TARGET[t] = index;
    });
    context.set('TARGETS', TARGETS);
    context.set('INDEX_BY_TARGET', INDEX_BY_TARGET);

    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }
        var logData = data.logData || data;
        var targetPath = require('../context').get('targetPath');
        var entries = logData;
        if (targetPath != null) {
            entries = u.filter(logData, function (item) {
                return item.path.indexOf(targetPath) >= 0
                    && u.contains(TARGETS, item.target);
            });
        }
        var perfId = null;
        u.find(entries, function (item) {
            perfId = item.performanceId;
            return perfId != null;
        });
        if (perfId == null) {
            perfId = globalId++;
        }
        var ret = null;
        if (entries.length) {
            var perfResult = [];
            var itemsByTarget = u.indexBy(entries, 'target');
            u.each(targets, function (target) {
                perfResult.push(getByDotExpr(itemsByTarget, target));
            });
            ret = {};
            ret[perfId] = perfResult;
        }
        cb(null, ret);
    });
};

