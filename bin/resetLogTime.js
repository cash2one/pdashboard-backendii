/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file resetLogTime.js
 * @author Pride Leong<lykling.lyk@gmail.com>
 */

var fs = require('fs-extra');
var moment = require('moment-datetime');
var _ = require('underscore');
var connectDb = require('./db').connectDb;

// 读取项目配置文件
var config = JSON.parse(fs.readFileSync(process.env.HOME + '/.nightingale.conf', 'utf8'));
// arguments
var argv = require('yargs')
    .usage('')
    .option('f', {
        describe: 'read list from file',
        type: 'string'
    })
    .option('o', {
        describe: 'encoded path list',
        type: 'string'
    })
    .option('t', {
        describe: 'reset time, default value last day',
        type: 'string'
    })
    .argv;

exports.run = function (argv) {
    var prefix = 'hdfs://nmg01-khan-hdfs.dmop.baidu.com:54310/app/ns/lsp/output/ecom_fengchao';
    var pathes = [];
    if (argv.o) {
        pathes = JSON.parse(argv.o);
    }
    else if (argv.f) {
        pathes = JSON.parse(fs.readFileSync(argv.f));
    }
    else {
        // for test
        // 'fengchao_feview_performance_jsonlog_nirvanaII_json_daily',
        // 'fengchao_feview_performance_jsonlog_nirvana_json_daily',
        // 'fengchao_feview_performance_jsonlog_nirvana_json_daily_2',
        // 'fengchao_feview_performance_jsonlog_nirvana_json_hourly',
        // 'fengchao_feview_performance_jsonlog_nirvanaII_json_hourly',
        // 'fengchao_feview_uv_jsonlog_adpreview_json',
        // 'fengchao_feview_pv_jsonlog_adpreview_json',
        // 'fengchao_feview_uv_jsonlog_adpreview_json_hourly',
        // 'fengchao_feview_pv_jsonlog_adpreview_json_hourly'
        pathes = [
            'fengchao_feview_performance_jsonlog_nirvanaII_json_daily',
            'fengchao_feview_performance_jsonlog_nirvana_json_daily',
            'fengchao_feview_performance_jsonlog_nirvana_json_daily_2',
            'fengchao_feview_performance_jsonlog_nirvana_json_hourly',
            'fengchao_feview_performance_jsonlog_nirvanaII_json_hourly'
        ];
    }
    var datetime = moment().add('d', -1).strftime('%Y-%m-%d %H:%M');
    if (argv.t) {
        datetime = argv.t;
    }
    return connectDb(config['db-url']).then(function (db) {
        var coll = db.collection('lsp_log_timestamp');
        var docs = _.map(pathes, function (path) {
            return {
                path: prefix + '/' + path,
                statestamp: datetime
            };
        });
        var defer = Promise.defer();
        coll.remove({path: {$in: _.pluck(docs, 'path')}}, function (err, result) {
            if (err) {
                defer.reject(err);
            }
            else {
                coll.insert(docs, function (err, result) {
                    if (err) {
                        defer.reject(err);
                    }
                    else {
                        defer.resolve(result);
                    }
                });
            }
        });
        return defer.promise.then(
            function (result) {
                db.close();
                return result;
            },
            function (err) {
                db.close();
                return Promise.reject(err);
            }
        );
    });
};

if (require.main === module) {
    exports.run(argv);
}
