/**
 * @file 输出列表统计信息结果，分位值横向排布
 * @author hanbingfeng
 */

var u = require('underscore');

exports.step = function (entryNames) {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }
        var res = '\n\t\t95\t\taverage\t\t50\t\t80\t\tcount\n';
        u.each(entryNames, function (name) {
            var entry = data[name];
            if (entry == null) {
                return;
            }
            res += name + '\t' + entry['95'] + '\t\t' + entry['average']
                + '\t\t' + entry['50'] + '\t\t' + entry['80'] + '\t\t'
                + entry['count'];
            res += '\n';
        });
        cb(null, res);
    });
}
