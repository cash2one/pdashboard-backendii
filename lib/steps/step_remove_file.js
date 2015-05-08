/**
 * @file 删除context中filePath所指的文件
 * @author hanbingfeng@baidu.com
 */

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        var path = require('../context').get('filePath');
        if (path != null) {
            require('fs').unlinkSync(path);
        }
        cb(null, data);
    });
};

