/**
 * @file 下载日志，并处理
 * @author wujianwei01@baidu.com
 * 
 */
var fs = require('fs-extra');
var moment = require('moment-datetime');
var _ = require('underscore');
var connectDb = require('./db').connectDb;

// 加载文件下载模块
var getItem = require('./get_item').getItem;

// 读取项目配置文件
var config = JSON.parse(fs.readFileSync(process.env.HOME + '/.nightingale.conf', 'utf8'));

// 加载日志校验模块
var checkLog = require('./checkLog');
var getLogStamp = checkLog.getLogStamp;
var checkLogStamp = checkLog.checkLogStamp;
var addLogStamp = checkLog.addLogStamp;
var updateLogStamp = checkLog.updateLogStamp;
var saveLogStamp = checkLog.saveLogStamp;

var processLog = require('./process_log_hourly');
var map = {
    'basicPlanReader': {
        up: [],
        down: ['basicPlanSpliter']
    },
    'basicPlanSpliter': {
        up: ['basicPlanReader'],
        down: ['done']
    },
    'done': {
        up: ['basicPlanSpliter'],
        down: []
    }
};

/**
 * 利用mongodb自身的连接池
 * 不用每次插入数据时都连接，断开，占用mongo资源
 *
mongo.MongoClient.connect(config['db-url'], function (err, database) {
    if (err) {
        throw err;
    }
    db = database;
});*/
/**
 * 下载文件，并处理
 */
exports.run = function () {
    var watchingList = config['watching-hourly-list'];
    console.log('############', moment().strftime('%Y-%m-%d %H:%M'), 'processor start ###########');
    connectDb(config['db-url']).then(function (db){
        Promise.all(
            _.map(watchingList, function (conf){
                var period = conf.period;
                var jobname = conf.name;
                var sourceDir = config['log-cluster']
                    + '/' + config['lsp-path']
                    + '/lsp'
                    + '/output/ecom_fengchao';
                var opts = {
                    period: period,
                    jobname: jobname,
                    sourceDir: sourceDir,
                };
                return getLogStamp(opts).then(function (statestamp) {
                    opts.statestamp = statestamp;
                    return checkLogStamp(opts, db).then(function (result) {
                        if (result.reason) {
                            addLogStamp(opts, db);
                            return getItem(opts, config['data-path'], result.reason).then(function (){
                                return Promise.all(_.map(result.sources, function (source) {
                                    opts.destination = config['data-path'] + '/' + source + '/' + opts.jobname;
                                    var timeArr = source.split('/').slice(1);
                                    opts.recordTimestamp = +moment.fn.strptime(timeArr[0] + timeArr[1], '%Y%m%d%H%M');
                                    return processLog(opts, db, map);
                                    })
                                )
                            }, function (reject) {
                            });
                        }
                        else {
                            updateLogStamp(opts, db);
                            return Promise.all(
                                _.map(result.sources, function(source) {
                                    opts.source = source;
                                    return getItem(opts, config['data-path'], result.reason)
                                        .then(function (code){
                                            opts.destination = config['data-path'] + '/' + source + '/' + opts.jobname;
                                            var timeArr = source.split('/').slice(1);
                                            opts.recordTimestamp = +moment.fn.strptime(timeArr[0] + timeArr[1], '%Y%m%d%H%M');
                                            return processLog(opts, db, map);
                                        })
                                })
                            );
                        }
                    },function () {
                        // 数据库中时间戳与文件时间戳一致
                        console.log(opts.jobname, '*********statestamp equal', 'exit');
                    });
                }, function (err) {
                });
            })
        ).then(function () {
            return require('./warn').run(db, config['work-home'] + '/bin/mailTpl.tpl');
        }).then(function (warns) {
            db.close();
            console.log('*************', 'mail warn: ', warns.warn, ' *******************');
            if (warns.warn) {
                console.log('*************', 'sendMail code: ', warns.code, ' ******************');
            }
            console.log('############', moment().strftime('%Y-%m-%d %H:%M'), 'all processor done ###########');
        }).catch(function (err) {
            db.close();
            console.log(err);
        });
        }, function () {
    });
    return Promise.resolve();
}

if (require.main === module) {
    exports.run();
}
