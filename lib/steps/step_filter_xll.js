/**
 * @file 读入小流量名单文件，过滤输入日志到小流量名单内。
 *       从context中读xll属性，为一个数组
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');
var context = require('../context');
var xll = null;

exports.step = function () {
    var xllList = context.get('xll');
    if (xllList && xllList.length) {
        xll = {};
        u.each(xllList, function (xllFile) {
            var content = require('fs').readFileSync(xllFile);
            u.each(content.toString().split('\n'), function (id) {
                xll[id] = true;
            });
        });
    }

    return require('event-stream').map(function (data, cb) {
        if (xll == null) {
            cb(null, data);
            return;
        }
        var useridMatch = /userid=(\d+)/.exec(data);
        if (useridMatch == null) {
            cb(null, data);
            return;
        }
        var userid = useridMatch[1];
        if (xll[userid]) {
            cb(null, data);
        }
        else {
            cb(null, null);
        }
        return;
    });
};
