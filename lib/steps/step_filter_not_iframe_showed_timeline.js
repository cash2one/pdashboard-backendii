/**
 * @file 过滤含D点的timeline
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var INDEX_BY_EXPR = require('../context').get('INDEX_BY_EXPR');
        
        cb(null, u.pick(data, function (entries) {
            var isIframeShowed = entries[INDEX_BY_EXPR['timeline.iframeShowed']];
            return isIframeShowed !== true;
        }));
    });
};

