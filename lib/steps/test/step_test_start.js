/**
 * @file 测试用step，接受arguments中的所有内容，作为数组逐一作为readable发出。
 * @author hanbingfeng@baidu.com
 */

exports.step = function () {
    var arr = Array.prototype.slice.apply(arguments);

    return require('event-stream').readArray(arr);
};

