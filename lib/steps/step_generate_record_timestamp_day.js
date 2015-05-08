/**
 * @file 从context中的filePath拿文件名，截取最后一个"."之后的串作为时间戳，
 *       转化为unix time后存入context的recordTimestamp中。
 *       不会修改上游的data。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');
var M = require('moment');

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var filePath = require('../context').get('filePath');
        if (filePath == null) {
            cb(null, data);
            return;
        }

        var timestamp = filePath.substr(filePath.lastIndexOf('.') + 1);
        var recordTimestamp = new M(timestamp, 'YYYYMMDD').valueOf();
        require('../context').set('recordTimestamp', recordTimestamp);
        cb(null, data);
    });
};
