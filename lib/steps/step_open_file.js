/**
 * @file 读入一个文件作为input strem。从context中拿filePath
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    return require('event-stream').readable(function (count, cb) {
        var me = this;
        var filePath = require('../context').get('filePath');
        if (filePath == null) {
            cb(new Error('需要设置filePath来打开文件。'));
            return;
        }

        try {
            var readStream = require('fs').createReadStream(filePath);
            readStream.on('data', u.bind(u.partial(me.emit, 'data'), me));
            readStream.on('end', function () {
                cb(null);
                me.emit('end');
            });
        }
        catch (ex) {
            cb(ex);
        }
    });
};

