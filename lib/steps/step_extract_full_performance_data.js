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
    u.find(expr.split('.'), function (key, index, list) {
        value = value[key];
        if (u.isArray(value)) {
            var res = [];
            u.each(value,
                // 当取值时，若中途遇到某个值是array，则针对array中每个元素，取剩下的值
                function (v) {
                    res.push(getByDotExpr(v, list.slice(index + 1).join('.')));
                }
            );
            value = u.chain(res).flatten().filter().value();
            return true;
        }
        return value == null;
    });
    if (u.isArray(value)) {
        if (value.length) {
            return value;
        }
        return null;
    }
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
                return item.path && item.path.indexOf(targetPath) >= 0
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
                    var value = getByDotExpr(itemsByTarget, target);
                    if (value < 0) {
                        console.error('found negative performance value', data);
                    } else {
                        perfResult.push(getByDotExpr(itemsByTarget, target));
                    }
                }
            });
            ret = {};
            ret[perfId] = perfResult;
        }
        cb(null, ret);
    });
};

