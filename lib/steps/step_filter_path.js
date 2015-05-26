/**
 * @file 过滤日志中的path，path值从targetPath里读取。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    var path = require('../context').get('targetPath');
    
    return require('event-stream').map(function (data, cb) {
        cb(null, u.filter(data.logData, function (item) {
            return item.path.indexOf(path) >= 0;
        }));
    });
}

