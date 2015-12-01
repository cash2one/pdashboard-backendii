/**
 * @file 检查log日志是否更新，通过log平台日志文件时间与存入数据库的时间对比
 * @author wujianwei01@baidu.com
 *
 */
/* eslint-env node */

var childProcess = require('child_process');
var readline = require('readline');
var moment = require('moment-datetime');
/**
 * 获取log平台日志文件时间戳
 * @param {Object} opts 传入的参数
 * @return {Promise}
 */

exports.getLogStamp = function (opts) {
    return new Promise(function (resolve, reject) {
        var proc = childProcess.exec(
            'hadoop dfs -ls ' + opts.sourceDir
            + '|grep ' + opts.jobname
            + '|awk \'{print $6" "$7}\''
        );
        var rd = readline.createInterface({
            input: proc.stdout,
            output: process.stdout,
            terminal: false
        });
        rd.on('line', function (line) {
            resolve(line);
        });
        proc.on('close', function (code) {
            rd.close();
            if (0 !== code) {
                reject(code);
            }
        });
    });
};

exports.checkForUpdating = function (opts, db) {
    return new Promise(function (resolve, reject) {
        console.info('[info]', 'checking', opts.jobname);
        var coll = db.collection('lsp_log_timestamp');
        coll.find({path: opts.sourceDir + '/' + opts.jobname}).toArray(function (err, docs) {
            var datetimefmt = '%Y-%m-%d %H:%M';
            var command = ''
                + 'hadoop dfs -lsr ' + '\'' + opts.sourceDir
                + '/' + opts.jobname + '\''
                + ' |grep ' + '\'00\/' + opts.jobname + '$\''
                + ' |awk \'{print $6" "$7" "$8}\'';
            var proc = childProcess.exec(
                command,
                {
                    maxBuffer: 1 << 20
                }
            );
            var rd = readline.createInterface({
                input: proc.stdout,
                output: process.stdout,
                terminal: false
            });
            // file pathes to update
            var pathes = [];
            var origDatetime = '1970-01-01 00:00';
            if (!err && docs.length !== 0) {
                origDatetime = docs[0].statestamp;
            }
            var origTimestamp = +moment.fn.strptime(origDatetime, datetimefmt);
            var newDatetime = origDatetime;
            var newTimestamp = origTimestamp;
            rd.on('line', function (line) {
                var itemList = line.split(' ');
                var date = itemList[0];
                var time = itemList[1];
                var filepath = itemList[2];
                var fileTimestamp = +moment.fn.strptime(date + ' ' + time, datetimefmt);
                if (fileTimestamp > origTimestamp) {
                    pathes.push(filepath);
                    if (fileTimestamp > newTimestamp) {
                        newTimestamp = fileTimestamp;
                        newDatetime = date + ' ' + time;
                    }
                }
            });
            proc.on('close', function () {
                rd.close();
                resolve({
                    oldTimestamp: origTimestamp,
                    newTimstampe: newTimestamp,
                    oldDatetime: origDatetime,
                    newDatetime: newDatetime,
                    pathes: pathes
                });
            });
        });
    });
};

/**
 * 检查log平台日志文件时间戳与存入数据库中的时间戳
 * @param {Object} opts 传入的参数
 * @param {Object} db  mongodb
 * @return {Promise}
 *
 */
exports.checkLogStamp = function (opts, db) {
    return new Promise(function (resolve, reject) {
        var coll = db.collection('lsp_log_timestamp');
        coll.find({path: opts.sourceDir + '/' + opts.jobname}).toArray(function (err, docs) {
            // console.log(docs);
            if (docs.length > 0 && docs[0].statestamp === opts.statestamp) {
                // 若数据库中存的时间戳和获取文件的时间戳一致， resolve
                reject({
                    reason: -1
                });
            }
            else {
                var command = ''
                    + 'hadoop dfs -lsr ' + '\'' + opts.sourceDir
                    + '/' + opts.jobname + '\''
                    + ' |grep ' + '\'00\/' + opts.jobname + '$\''
                    + ' |awk \'{print $6" "$7" "$8}\'';
                var proc = childProcess.exec(
                    command,
                    {
                        maxBuffer: 1 << 20
                    }
                );
                var rd = readline.createInterface({
                    input: proc.stdout,
                    output: process.stdout,
                    terminal: false
                });
                var sources = [];
                var stampIndb = '';
                var reason = 0;
                if (docs.length === 0) {
                    stampIndb = '1980-01-01 00:50';
                    reason = 1;
                }
                else {
                    stampIndb = docs[0].statestamp;
                }
                // 数据库中存在该目录的时间戳，只将文件时间戳大于数据库的时间戳的文件处理
                rd.on('line', function (line) {
                    var arr = line.split(' ');
                    var fileTimestamp = +moment.fn.strptime(arr[0] + ' ' + arr[1], '%Y-%m-%d %H:%M');
                    var source = arr[2].split('/').slice(-4, -1).join('/');
                    if (fileTimestamp > +moment.fn.strptime(stampIndb, '%Y-%m-%d %H:%M')) {
                        sources.push(source);
                    }
                });
                proc.on('close', function () {
                    rd.close();
                    resolve({
                        reason: reason,
                        sources: sources
                    });
                });
            }
        });
    });
};

/**
 * 对于数据库中没有相应文件时间戳的则增加
 * @param {Object} opts 传入的参数
 * @param {Object} db mongodb
 * @return {Promise}
 */
exports.addLogStamp = function (opts, db) {
    return new Promise(function (resolve, reject) {
        var coll = db.collection('lsp_log_timestamp');
        coll.insert(
            [{path: opts.sourceDir + '/' + opts.jobname, statestamp: opts.statestamp}],
            function (err, result) {
                if (null != err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            }
        );
    });
};

/**
 * 数据库中已存在该文件对应的时间戳，但是日志文件的时间戳是最新的，需要更新
 * @param {Object} opts 传入的参数
 * @param {Object} db mongodb
 * @return {Promise}
 */
exports.updateLogStamp = function (opts, db) {
    return new Promise(function (resolve, reject) {
        var coll = db.collection('lsp_log_timestamp');
        coll.update(
            {path: opts.sourceDir + '/' +  opts.jobname}, {$set: {statestamp: opts.statestamp}},
            function (err, result) {
                if (null != err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            }
        );
    });
};
