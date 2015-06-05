/**
 * @file 过滤有A点的性能数据
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {

    var INDEX_BY_EXPR = require('../context').get('INDEX_BY_EXPR');
    var staticIndex = INDEX_BY_EXPR['performance_static'];
    
    return require('event-stream').map(function (data, cb) {
        if (staticIndex == null) {
            cb(null, data);
            return;
        }
        
        cb(null, u.pick(data, function (entries) {
            return entries[staticIndex] != null;
        }));
    }); 
};

