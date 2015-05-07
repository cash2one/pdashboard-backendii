/**
 * @file 踢掉上游data中的一些key。
 * @author hanbingfeng@baidu.com
 */

exports.step = function (keys) {
    return require('event-stream').map(function (data, cb) {
        cb(null, require('underscore').omit(data, keys));
    });
};
