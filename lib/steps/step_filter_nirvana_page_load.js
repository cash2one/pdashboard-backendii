/*
 * @file 过滤出nirvana_page_load，加上context中targetPath做过滤
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    var targetPath = require('../context').get('targetPath');

    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }
        
        var pageLoad = u.filter(data.logData, function (item) {
            return item.target === 'NIRVANA_PAGE_LOAD'
            && item.path.indexOf(targetPath) >= 0;
        });

        var static = u.filter(data.logData, function (item) {
            return item.target === 'performance_static'
            && item.path.indexOf(targetPath) >= 0;
        });

        if (pageLoad.length/* && static.length === 0*/) {
            cb(null, pageLoad);
        }
        else {
            cb(null, null);
        }
    });
};
