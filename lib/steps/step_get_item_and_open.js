/**
 * @file 作为起始脚本，调用get_item.sh下载一个log文件并打开
 *       会从context的getItemArgs中读取get_item的参数表
 *       log文件的path会写到context的logFilePath中。
 * @author Han Bing Feng
 */

var cp = require('child_process');
var u = require('underscore');

exports.step = function () {
    return require('event-stream').readable(function (count, cb) {
        var me = this;
        var getItemArgs = require('../context').get('getItemArgs');
        if (getItemArgs == null) {
            cb(new Error('需要通过设置getItemArgs指定get_item.sh的参数。'));
            return;
        }

        try {
            var ret = cp.exec(['sh', 'lib/get_item.sh']
                .concat(Array.prototype.slice.call(getItemArgs))
                .join(' '),
                {
                    cwd: require('path').resolve(__dirname, '../..'),
                    // timeout 10 minutes
                    timeout: 1800000
                },
                function (error, stdout, stderr) {
                    if (error != null) {
                        cb(new Error([JSON.stringify(error), stdout, stderr].join('\n')));
                        return;
                    }
                    var logFilePath = /@(.*)@/.exec(stdout)[1];
                    var readStream = require('fs').createReadStream(logFilePath);
                    readStream.on('data', u.bind(u.partial(me.emit, 'data'), me));
                    readStream.on('end', function () {
                        cb(null);
                        me.emit('end');
                    });
                    require('../context').set('logFilePath', logFilePath);
                }
            );
        }
        catch (ex) {
            cb(ex);
        }
    });
};

if (process.argv[1] === __filename) {
    require('../context').set('getItemArgs', process.argv.slice(2));
    console.log(exports.step());
}

