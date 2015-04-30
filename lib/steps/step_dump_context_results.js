/**
 * @file 返回context里results区的内容
 * @author hanbingfeng@baidu.com
 */

exports.step = function () {
    return require('event-stream').readable(function (count, cb) {
        cb(null, require('../context').get('results'));
        this.emit('end');
    });
};
