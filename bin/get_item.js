/**
 *
 * @file 利用hadoop-client获取日志平台上的日志文件
 * @author wujianwei01@baidu.com
 */
/* eslint-env node */

var fs = require('fs-extra');
var childProcess = require('child_process');
var Queue = require('./Queue');
var _ = require('underscore');

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
 * working queue
 *
 * @type {Queue}
 */
var workingQueue = new Queue({});

/**
 * pending queue
 *
 * @type {Queue}
 */
var pendingQueue = new Queue({});

/**
 * The limit in working queue
 *
 * @type {number}
 */
var WORKING_LIMIT = 10;

workingQueue.on('removed', function (evt) {
    var me = this;
    if (pendingQueue.getLength() > 0) {
        var pendingJob = pendingQueue.shift();
        var job = pendingJob.start();
        me.add(job);
        job.then(pendingJob.resolver, pendingJob.rejecter);
        job.then(
            function () {
                me.remove(job);
            },
            function () {
                me.remove(job);
            }
        );
    }
    console.info('[debug]', 'working jobs:', me.getLength(), 'pending jobs:', pendingQueue.getLength());
});

exports.download = function (pathes, savepath, opts) {
    return Promise.all(_.map([].concat(pathes), function (path) {
        // console.log('[debug]', 'ready to download', path);
        var destpath = savepath + '/' + path.split('/').slice(-4).join('/');
        // console.log('[debug]', 'destination path:', destpath);
        var command = 'hadoop dfs -get ' + path + ' ' + destpath;
        // console.log('[debug]', 'download command:', command);
        function downloadLog() {
            return new Promise(function (resolve, reject) {
                if (fs.existsSync(destpath)) {
                    if (opts.enableCache) {
                        // console.log('[debug]', 'cache enabled, ignoring downloading', path);
                        resolve();
                    }
                    else {
                        // console.log('[debug]', 'remove existed log', destpath);
                        fs.removeSync(destpath);
                        // console.log('[debug]', 'downloading', path, 'to', destpath);
                        execute(command).then(resolve, reject);
                        // resolve();
                    }
                }
                else {
                    // console.log('[debug]', 'creating log path');
                    fs.mkdirpSync(destpath.split('/').slice(0, -1).join('/'));
                    // console.log('[debug]', 'downloading', path, 'to', destpath);
                    execute(command).then(resolve, reject);
                    // resolve();
                }
            });
        }
        var job;
        var pendingJob;
        // console.log('[debug]', 'working limit:', WORKING_LIMIT);
        // console.log('[debug]', 'woeking queue:', workingQueue);
        // console.log('[debug]', 'working queue length:', workingQueue.getLength());
        if (workingQueue.getLength() < WORKING_LIMIT) {
            // console.log('[debug]', 'add download job', destpath);
            job = downloadLog();
            workingQueue.add(job);
            job.then(
                function () {
                    workingQueue.remove(job);
                },
                function () {
                    workingQueue.remove(job);
                }
            );
        }
        else {
            // console.log('[debug]', 'add pending job', destpath);
            pendingJob = {
                start: downloadLog
            };
            job = new Promise(function (resolve, reject) {
                pendingJob.resolver = resolve;
                pendingJob.rejecter = reject;
            });
            pendingQueue.add(pendingJob);
        }
        return job;
    }));
};

/**
 * getItem 获取日志文件
 *
 * @param {Object} opts 下载配置选项
 * @param {string} dataPath 项目存放目录
 * @param {string} reason 判断数据库中是否存在log平台上的对应时间戳
 *
 * @return {Promie}
 */
exports.getItem = function (opts, dataPath, reason) {
    // log平台上的日志目录
    var source = '';
    // 本地存放目录
    var destination = '';
    if (reason) {
        source = opts.sourceDir + '/' + opts.jobname;
        destination = dataPath + '/' + opts.jobname;
    }
    else {
        source =  opts.sourceDir + '/' + opts.source + '/' + opts.jobname;
        destination = dataPath + '/' + opts.source;
    }
    var command  = 'hadoop dfs -get ' + source + ' ' + destination;
    return new Promise(function (resolve, reject) {
        fs.stat(destination, function (err, stat) {
            if (err) {
                if ('ENOENT' === err.code) {
                    fs.mkdirpSync(reason === 1 ? dataPath : destination, 493);
                }
                else {
                    reject(1);
                }
            }
            var filePath = destination + '/' + (reason === 1 ? '' : opts.jobname);
            if (fs.existsSync(filePath)) {
                fs.removeSync(filePath);
            }
            console.info('[info]', 'downloading', source, 'to', destination);
            execute(command).then(resolve, reject);
        });
    });
};
