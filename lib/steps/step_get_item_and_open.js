/**
 * @file 作为起始脚本，调用get_item.js下载一个log文件并打开
 *       会从context的getItemArgs中读取get_item的参数表
 *       log文件的path会写到context的logFilePath中。
 * @author Han Bing Feng
 * @author wujianwei01@baidu.com
 */

var cp = require('child_process');
var u = require('underscore');
// timeout 3 hour
var TIMEOUT = 3 * 1000 * 60 * 60;

exports.step = function () {
    return require('event-stream').readable(function (count, cb) {
        var me = this;
        var getItemArgs = require('../context').get('getItemArgs');
        if (getItemArgs == null) {
            cb(new Error('需要通过设置getItemArgs指定get_item.sh的参数。'));
            return;
        }
        try {
            var stdoutput = '';
            var getItemProcess = cp.spawn('node',
                ['lib/get_item.js'].concat(getItemArgs),
                {
                    cwd: require('path').resolve(__dirname, '../..'),
                    stdio: ['pipe', 'pipe', 'ignore']
                }
            );
            var termTimeout = setTimeout(function () {
                getItemProcess.kill();
                cb(new Error('get_item.js 超时了。'));
            }, TIMEOUT);
            getItemProcess.stdout.on('data', function (data) {
                stdoutput += data.toString();
            });
            getItemProcess.on('close', function (code) {
                if (code != 0) {
                    cb(new Error('get_item.js 出错了，返回值' + code));
                    return;
                }
                clearTimeout(termTimeout);
                var logFilePath = /@(.*)@/.exec(stdoutput)[1];
                var readStream = require('fs').createReadStream(logFilePath);
                readStream.on('data', u.bind(u.partial(me.emit, 'data'), me));
                readStream.on('end', function () {
                    cb(null);
                    me.emit('end');
                });
                require('../context').set('filePath', logFilePath);
            });
        }
        catch (ex) {
            cb(ex);
        }
    });
};

if (process.argv[1] === __filename) {
    require('../context').set('getItemArgs', process.argv.slice(2));
}

