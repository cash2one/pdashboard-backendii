/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file run.js
 * @author Pride Leong<lykling.lyk@gmail.com>
 */
/* eslint-env node */

var fs = require('fs-extra');
var moment = require('moment-datetime');
var _ = require('underscore');
var connectDb = require('./db').connectDb;

// 加载文件下载模块
var download = require('./get_item').download;

// 读取项目配置文件
var config = JSON.parse(fs.readFileSync(process.env.HOME + '/.nightingale.conf', 'utf8'));

// 加载日志校验模块
var checkLog = require('./checkLog');
var argv = require('yargs')
    .usage('')
    .option('m', {
        describe: 'enable mail alarmer',
        type: 'boolean'
    })
    .option('t', {
        describe: 'run for hourly logs',
        type: 'boolean'
    })
    .example('', '$0 -m -t')
    .argv;

// 映射日志处理器
var processorMaps = require('./maps');
var unionMap = {};
_.each(processorMaps, function (map) {
    _.extend(unionMap, map);
});

// 日志处理器启动器
var launcher = require('./processor/launcher');

/**
 * 下载文件，并处理
 *
 * @return {Promise}
 */
exports.run = function () {
    var watchingList = argv.t ? config['watching-list-hourly'] : config['watching-list'];
    console.info('[info]', moment().strftime('%Y-%m-%d %H:%M'), 'processor start');
    connectDb(config['db-url']).then(function (db) {
        Promise.all(_.map(watchingList, function (conf) {
            // check log

            var period = conf.period;
            var jobname = conf.name;
            var sourceDir = config['log-cluster']
                + '/' + config['lsp-path']
                + '/lsp'
                + '/output/ecom_fengchao';
            var opts = {
                period: period,
                jobname: jobname,
                sourceDir: sourceDir
            };
            return checkLog.checkForUpdating(opts, db).then(
                function (result) {
                    return _.extend({opts: opts}, result);
                },
                function (result) {
                    console.warn('[warn]', 'checking log', jobname, 'fail');
                    return {
                        opts: opts,
                        oldTimestamp: '',
                        newTimstampe: '',
                        oldDatetime: '',
                        newDatetime: '',
                        pathes: []
                    };
                }
            );
        })).then(function (args) {
            // download log
            console.info('[info]', 'downloading logs');
            // console.log('[debug]', 'download args:', JSON.stringify(args, null, 4));
            var pathes = _.flatten(_.pluck(args, 'pathes'));
            // console.log('[debug]', 'download args:', JSON.stringify(pathes, null, 4));
            return download(pathes, config['data-path'], {
                enableCache: true
            }).then(
                // download success
                function () {
                    console.info('[info]', 'log download successful');
                    return args;
                },
                // download fail or partial fail
                function () {
                    console.error('[error]', 'there are something wrong occure while downloading');
                    return Promise.reject(args);
                }
            );
        }).then(function (args) {
            // execute log perocessor
            console.info('[info]', 'updating logs');
            return launcher.launch(unionMap, args, {
                db: db,
                config: config
            }).then(
                function () {
                    console.info('[info]', 'log updated');
                    return args;
                },
                function (err) {
                    console.error('[error]', 'there are something wrong occure while updating logs');
                    console.trace(err);
                    return Promise.reject(args);
                }
            );
        }).then(function (args) {
            // update log timestamp
            console.info('[info]', 'updating timestamp of logs');
            return Promise.all(_.map(args, function (result) {
                var isFirstRunning = result.oldDatetime === '1970-01-01 00:00';
                var opts = _.extend({
                    statestamp: result.newDatetime
                }, result.opts);
                if (result.newDatetime) {
                    if (isFirstRunning) {
                        return checkLog.addLogStamp(opts, db);
                    }
                    return checkLog.updateLogStamp(opts, db);
                }
                return Promise.resolve();
            })).then(
                function () {
                    console.info('[info]', 'log timestamp updated');
                    return args;
                },
                function () {
                    console.error('[error]', 'log timestamp update fail');
                    return Promise.reject(args);
                }
            );
        }).then(function (args) {
            // execute mail alarm
            if (argv.m) {
                console.info('[info]', 'launch mail alarmer');
                return require('./warn').run(db, config['work-home'] + '/bin/mailTpl.tpl').then(
                    function (warns) {
                        console.info('[info]', 'mail alarmer lauch success');
                        console.info('[info]', 'mail warn:', warns.warn);
                        console.info('[info]', 'mail code:', warns.code);
                    },
                    function (result) {
                        console.error('[error]', 'mail alarmer launch failed');
                    }
                );
            }
            return args;
        }).then(function (args) {
            db.close();
            return args;
        }).then(function (args) {
            console.info('[info]', moment().strftime('%Y-%m-%d %H:%M'), 'all processor done');
            return args;
        }).catch(function (err) {
            db.close();
            console.trace(err);
        });
    });
    return Promise.resolve();
};

if (require.main === module) {
    exports.run();
}
