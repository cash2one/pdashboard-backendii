/**
 * @file 解析并向下游输出json。
 * @author hanbingfeng@baidu.com
 */

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        try {
            cb(null, JSON.parse(data));
        }
        catch (ex) {
            console.error('cannot parse line to json, ', data, ex);
            cb(null, null);
        }
    });
};
