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
    // 历史原因，叫这个名字的expr要调整一下
    switch (expr) {
        case 'performance_static':
        case 'performance_materialList':
        case 'performance_accountTree':
        case 'performance_ao_manual':
            expr = expr + '.' + expr;
            break;
        default:
            break;
    }
    u.find(expr.split('.'), function (key) {
        value = value[key];
        return value == null;
    });
    return value;
}

exports.step = function (targets) {
    var TARGETS = [];
    var INDEX_BY_EXPR = {};
    u.each(targets, function (target, index) {
        var t = target.indexOf('.') >= 0 ?
            target.substring(0, target.indexOf('.'))
            : target;

        TARGETS.push(t);
        INDEX_BY_EXPR[target] = index;
    });
    context.set('TARGETS', TARGETS);
    context.set('INDEX_BY_EXPR', INDEX_BY_EXPR);

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
                if (target === 'userid') {
                    perfResult.push(data.userid);
                }
                else if (target === 'token') {
                    perfResult.push(data.token);
                }
                else if (target === '') {
                    perfResult.push(null);
                }
                else {
                    perfResult.push(getByDotExpr(itemsByTarget, target));
                }
            });
            ret = {};
            ret[perfId] = perfResult;
        }
        cb(null, ret);
    });
};

