/**
 *
 * @file 利用hadoop-client获取日志平台上的日志文件
 * @author wujianwei01@baidu.com
 */

var fs = require('fs-extra');
var childProcess = require('child_process');

/**
 * 执行shell command
 *
 * @param {string} cmd 需要执行的命令
 * @return {Promise} 执行完成的结果
 */
function execute(cmd) {
    return new Promise(function (resolve, reject) {
        var exec = childProcess.exec(cmd);
        exec.stdout.on('data', function (data) {
            process.stdout.write(data);
        });
        exec.stderr.on('data', function (data) {
            process.stdout.write(data);
        });
        exec.on('exit', function (code) {
            if (0 !== code) {
                reject(code);
            }
            resolve(code);
        });
    });
}

/**
 * getItem 获取日志文件
 * @param {Object} opts 下载配置选项
 * @param {string} dataPath 项目存放目录
 * @param {string} reason 判断数据库中是否存在log平台上的对应时间戳
 * @return 
 */
exports.getItem = function (opts, dataPath, reason) {
    // log平台上的日志目录
    var source = '';
    // 本地存放目录
    var destination = '';
    if (reason) {
        source = opts.sourceDir + '/'+ opts.jobname;
        destination = dataPath + '/' + opts.jobname;
    }
    else {
        source =  opts.sourceDir + '/' + opts.source + '/' + opts.jobname;
        destination = dataPath + '/' + opts.source;
    }
    var command  = 'hadoop dfs -get ' + source + ' ' + destination;
    return new Promise(function(resolve, reject) {
        fs.stat(destination, function (err, stat) {
            if (err) {
                if ('ENOENT' === err.code) {
                    fs.mkdirpSync(reason === 1 ? dataPath : destination, 0755);
                }
                else {
                    reject(1);
                }
            }
            if (fs.existsSync(destination + '/' + (reason === 1 ? '' : opts.jobname))) {
                resolve(0);
            }
            else {
                execute(command).then(resolve, reject);
            }
        }); 
    });
}
