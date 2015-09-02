/**
 * @file 下载统计任务文件
 * @author wujianwei01@baidu.com
 *
 * ==============================  Help  ==========================================================================
 * 必选的第一个参数：统计项的名称，具体的名字详见统计任务。
 * -s 开始日期=========>-s 20121021 #默认昨天
 * -f 结束日期=========>-f 20121023 #默认和开始日期相同
 * -b 开始分钟=======>-b 00 #默认0点，01:30代表1点30
 * -e 结束分钟=======>-e 23 #默认23点。注意：若开始、结束小时数仅设置一个，
 *    则视为只下载一个时间点的数据，开始结束保持一致。
 * -o 加上此参数代表下载“线下”的任务，默认不加代表“线上”。
 * -h 此参数控制任务的下载级别，如天级别、小时级别、半小时等，用秒数为值。小时级别就是3600，默认不加是“天”级的。
 * -m 代表下载md5文件，并且验证md5，若不通过会重新下载。
 * -l 保存路径=========>-l /home/users/wujianwei01/data #默认当前路径
 * ============================== Example ==========================================================================
 * node get_item.js ct439_crm
 *  ---   获取 线上 昨天的439任务的统计项结果（天级）
 * node get_item.js fclog_back_view_out_t -s 20121030 -h 3600 -o
 *  ---   获取 线下 20121030的涅盘日志后端处理统计任务结果（小时级）
 * node get_item.js fclog_back_view_out_t -s 20121030 -h 3600 -o -b 01:00
 *  ---   获取 线下 20121030的1点涅盘日志后端处理统计任务结果（小时级）
 *
 */
var argv = require('yargs').argv;
var fs = require('fs');
var cp = require('child_process');
var moment = require('moment-datetime');

/**
 * 处理传入的参数，处理完后通过hadoop下载文件
 * @param  {Array} argv 传入的参数
 */
function getItem(argv) {
    var LOG_NAME = argv._[0];
    if (!LOG_NAME) {
        console.error('Input invalid : Need Item_Name...');
    }
    var addZero = require('./common/util').addZeroWhileLessThanTen;
    var date = moment();
    var BEGIN_DATE = argv.s || '';
    if (!BEGIN_DATE) {
        BEGIN_DATE = date.subtract('d', 1).strftime('%Y%m%d');
    }
    var END_DATE = argv.f || '';
    if (!END_DATE) {
        END_DATE = BEGIN_DATE;
    }

    var BEGIN_TIME = argv.b || '';
    var END_TIME = argv.e || '';
    if (!BEGIN_TIME && !END_TIME) {
        BEGIN_TIME = '00';
        END_TIME = '23';
    }
    else if (BEGIN_TIME && !END_TIME) {
        END_TIME = BEGIN_TIME = addZero(BEGIN_TIME);
    }
    else if (!BEGIN_TIME && END_TIME) {
        BEGIN_TIME = END_TIME = addZero(END_TIME);
    }
    else {
        BEGIN_TIME = addZero(BEGIN_TIME);
        END_TIME = addZero(END_TIME);
    }

    var SAVE_FOLDER = argv.l || '.';
    var IS_OFFLINE = argv.o || false;
    var DOWNLOAD_LEVEL = argv.h || 86400;
    var NEED_MD5 = argv.m || 'NO';

    console.log('ITEM_NAME:' + LOG_NAME);
    console.log('BEGIN_DATE:' + BEGIN_DATE);
    console.log('END_DATE:' + END_DATE);
    console.log('BEGIN_TIME of eachday:' + BEGIN_TIME);
    console.log('END_TIME of eachday:' + END_TIME);
    console.log('SAVE_FOLDER:' + SAVE_FOLDER);
    console.log('IS_OFFLINE:' + IS_OFFLINE);
    console.log('DOWNLOAD_MD5:' + NEED_MD5);

    if (+BEGIN_DATE > +END_DATE) {
        console.error('Input invalid : [-b BEGIN_DATE] <= [-d END_DATE] is valid. eg: -b 20121021 -d 20121023');
        process.exit(-1);
    }
    if (+BEGIN_TIME > +END_TIME) {
        console.error('Input invalid : [-t BEGIN_TIME] <= [-n END_TIME] is valid');
        process.exit(-1);
    }

    // get item each time:begin
    var begin = moment.fn.strptime(BEGIN_DATE + BEGIN_TIME, '%Y%m%d%H');
    var beginLong = +begin;
    var end = moment.fn.strptime(END_DATE + END_TIME, '%Y%m%d%H');
    var endLong = +end;
    var addTime = DOWNLOAD_LEVEL * 1000;
    while (beginLong <= endLong) {
        begin = moment(beginLong);
        var callDate = begin.strftime('%Y%m%d');
        var callTime = begin.strftime('%H%M');
        getItemFromHadoop(LOG_NAME, callDate, callTime, SAVE_FOLDER, IS_OFFLINE, NEED_MD5);
        beginLong += addTime;
    }
}

/**
 * 根据传入的参数，利用hadoop-client 下载日志文件
 * @param {string} logName 日志文件名
 * @param {string|number} callDate 日期
 * @param {string|number} callTime 时间
 * @param {string} saveFolder 存储目录
 * @param {string} isOffline 是否在线
 * @param {string} needMd5   是否需要md5  暂时没用
 */
function getItemFromHadoop(logName, callDate, callTime, saveFolder, isOffline, needMd5) {
    var SAVE_FOLDER = '';
    if (saveFolder === '.') {
        SAVE_FOLDER = '/home/users/wujianwei01/data/logs/'
                       + saveFolder + '/' + logName + '/' + callDate + '/' + callTime;
    }
    else {
        SAVE_FOLDER += saveFolder  + logName + '/' + callDate + '/' + callTime;
    }

    var HADOOP_CLIENT_BIN = '/home/users/wujianwei01/hadoop-client/hadoop/bin/hadoop';

    var DOWNLOAD_ROOT = 'hdfs://nmg01-khan-hdfs.dmop.baidu.com:54310/app/ns/';
    var lspDir = '';
    if (isOffline === true) {
        lspDir = 'lsp';
    }
    else {
        lspDir = 'lsp_online';
    }
    var DOWNLOAD_DIR = DOWNLOAD_ROOT + lspDir
                       + '/output/ecom_fengchao' + '/' + logName + '/' + callDate + '/' + callTime;

    var COMMAND = HADOOP_CLIENT_BIN + ' fs -get ' + DOWNLOAD_DIR + ' ' + SAVE_FOLDER;

    fs.stat(SAVE_FOLDER, function (err, stat) {
        if (err) {
            if ('ENOENT' === err.code) {
                console.error('######文件不存在，下载文件######');
                var download = cp.exec(COMMAND);
                download.stdout.on('data', function (data) {
                    process.stderr.write(data);
                });
                download.stderr.on('data', function (data) {
                    process.stderr.write(data);
                });
                download.on('exit', function (code) {
                    if (code !== 0) {
                        console.error('######下载发生错误######');
                        if (fs.existsSync(SAVE_FOLDER)) {
                            fs.unlinkSync(SAVE_FOLDER);
                        }
                    }
                    console.log('######@' + SAVE_FOLDER + '/' + logName + '@下载成功######');
                });
            }
            else {
                console.error('######系统异常######');
            }
        }
        console.log('######@' + SAVE_FOLDER + '/' + logName  + '@已存在######');
    });
}
getItem(argv);
