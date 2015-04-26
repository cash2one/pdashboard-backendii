/**
 * @file 测试用step，输入的数字乘以2再输出
 * @author hanbingfeng@baidu.com
 */

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        cb(null, data * 2);
    });
};

