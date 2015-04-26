/**
 * @file console 打印上游的data，原样传回
 * @author hanbingfeng@baidu.com
 */

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        console.log('from step ', __filename, 'data: ', data);
        cb(null, data);
    });
};

