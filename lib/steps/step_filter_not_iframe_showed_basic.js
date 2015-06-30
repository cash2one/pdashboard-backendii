/**
 * @file 过滤基本性能点中，iframeShowed为1的点。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var INDEX_BY_EXPR = require('../context').get('INDEX_BY_EXPR');
        
        cb(null, u.pick(data, function (entries) {
            return entries[INDEX_BY_EXPR['performance_static.iframeShowed']] == null
                && entries[INDEX_BY_EXPR['performance_materialList.iframeShowed']] == null
                && entries[INDEX_BY_EXPR['performance_accountTree.iframeShowed']] == null
                && entries[INDEX_BY_EXPR['performance_ao_manual.iframeShowed']] == null
        }));
    });
};

