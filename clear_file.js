/**
 * @file 定时清理下载后的文件
 * @author wujianwei01@baidu.com
 * 使用示例
 * node clear_file.js
 * node clear_file.js -t
 * node clear_file.js -t time -d deleteFilePath
 *
 * ps: 需要在后台指定运行， crontab
 */

var fs = require('fs');
var u = require('underscore');
var path = require('path');
var moment = require('moment-datetime');

var argv = require('yargs')
    .usage('使用方法：node clear_file.js [选项]')
    .option('t', {
        describe: '清理文件的间隔时间/天',
        type: 'number'
    })
    .option('d', {
        describe: '需要清理的文件夹',
        type: 'string'
    })
    .example('node', 'clear_file.js -t 2 -d destination/dirname')
    .argv;

var intervalTime = 2;
if (argv.t !== true && typeof argv.t === 'number') {
    intervalTime = argv.t;
}
var desDir = argv.d || 'logs';
var time = moment();
fs.readdir(desDir, function (err, dirs) {
    if (err) {
        console.error('文件夹不存在,请重新输入');
        process.exit(-1);
    }
    u.each(dirs, function (dir) {
        var isDay = '';
        if (/hourly$/.test(dir) || /hour$/.test(dir)) {
            isDay = false;
            // 若为小时，默认间隔时间为6小时
            intervalTime = 6;
        }
        else if (/day$/.test(dir)) {
            isDay = true;
        }
        var fatherDirs = fs.readdirSync(path.join(desDir, dir));
        var sonDirs = [];
        if (fatherDirs.length > 0) {
            u.each(fatherDirs, function (fatherDir) {
                sonDirs = fs.readdirSync(path.join(desDir, dir, fatherDir));
                findDirAndRemove(path.join(desDir, dir, fatherDir), fatherDir, sonDirs, time, intervalTime, isDay);
            });
        }
        else {
            rmDir(path.join(desDir, dir));
            console.log(moment().strftime('%Y%m%d %H:%M:%S') + '\t' + path.join(desDir, dir) + '\t' + '被删除');
        }
    });
});

/**
 * 根据读出的文件名判断是按天还是按小时的目录
 * 若是按天的目录，直接处理
 * 若是按小时的目录，进入目录后，读取目录时间与当前时间比较
 * 若时间间隔大于设置的时间间隔则删除该目录
 * @param {string} pwd 当前目录
 * @param {string} superDir 父目录
 * @param {string} subDirs  父目录下的子目录
 * @param {number} time   当前时间的时间戳
 * @param {number} intervalTime 间隔时间
 * @param {bool} isDay  按天还是小时
 *
 */
function findDirAndRemove(pwd, superDir, subDirs, time, intervalTime, isDay) {
    if (subDirs.length === 0) {
        rmDir(pwd);
        console.log(moment().strftime('%Y%m%d %H:%M:%S') + '\t'  + pwd + '\t' + '被删除');
    }
    else {
        u.each(subDirs, function (subDir) {
            var downloadTime = moment.fn.strptime(superDir + subDir, '%Y%m%d%H%M');
            var removeDir = '';
            if (isDay) {
                removeDir = path.join(pwd, '..');
                intervalTime *= 24;
            }
            else {
                removeDir = path.join(pwd, subDir);
            }
            if (Math.ceil((time - downloadTime) / (1000 * 60 * 60)) > intervalTime) {
                rmDir(removeDir);
                console.log(moment().strftime('%Y%m%d %H:%M:%S') + '\t'  + removeDir + '\t' + '被删除');
            }
        });
    }
}

/**
 * 删除目录中所有文件
 * @param {string} dirPath 目录路径
 */
function rmDir(dirPath) {
    var files = fs.readdirSync(dirPath);
    if (files.length > 0) {
        for (var i = 0, len = files.length; i < len; i++) {
            var filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
            else {
                rmDir(filePath);
            }
        }
    }
    fs.rmdirSync(dirPath);
}
