/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file 报警
 * @author Jerry Woo<wujianwei01@baidu.com>
 */
var childProcess = require('child_process');
var md = require('moment-datetime');
var fs = require('fs-extra');
var etpl = require('etpl');
var _ = require('underscore');
var fixed2Data = require('../lib/common/util').fixed2Data;
var connectDb = require('./db').connectDb;

// 读取项目配置文件
var config = JSON.parse(fs.readFileSync(process.env.HOME + '/.nightingale.conf', 'utf8'));

var options = {
    'performance_plan_basic': [
        'performance_materialList',
        'performance_accountTree',
        'performance_newAomanual_query_end_2'
    ],
    'performance_keywordii_basic': [
        'performance_materialList',
        'performance_accountTree',
        'performance_newAomanual_query_end_2'
    ],
    'performance_timeline': [
        'performance_static_basicInfo',
        'performance_manage_new_aomanual',
    ],
    'performance_emanage_basic': [
        'performance_emanage_coreword_is_stable',
        'performance_emanage_sidebar_ActDataView_rendered',
        'performance_emanage_aopkg_enter'
    ]
};
var expect = {
    'performance_materialList': 6000
};
var threshold = {
    single: 1.05,
    avg: 1.05,
    sd: 1.3
}

/**
 * @description 运行程序
 * @param {object} db 对应的mongodb
 * @return {Promise}
 * @author wujianwei01@baidu.com
 */
exports.run = function(db, mailTplPath) {
    return new Promise(function (resolve, reject) {
        exports.getDataInDb(db)
        .then(function (data){
            return exports.mailHandle(data);
        }).then(function (mailContent) {
            if (mailContent.warn) {
                var mailTpl = fs.readFileSync(mailTplPath, 'utf8');
                etpl.compile(mailTpl);
                return exports.sendMail(etpl.render('mailContent', mailContent.result));
            }
            else {
                return {
                    warn: mailContent.warn,
                    code: 0
                };
            }
        }).then(function (res) {
            resolve(res);
        }).catch(function (err) {
            reject(err);
        })
    });
}

/**
 * @description 处理邮件告警
 * @param {array} data 从数据库中得到的数据
 * @return {Promise}
 * @author wujianwei01@baidu.com
 */
exports.mailHandle = function (data) {
    var warnResult = {
        gtExpect: {
            name: '与期望值相比',
            keys: [],
            value: []
        },
        gtLast: {
            name: '与前一天相比',
            keys: [],
            value: []
        },
        gtContinusAvg: {
            name: '连续7天均值',
            keys: [],
            value: []
        },
        gtContinusVariance: {
            name: '连续7天标准差',
            keys: [],
            value: []
        },
        gtLastWeek: {
            name: '本周与上周均值比较',
            keys: [],
            value: []
        }
    };
    var isWarning = [];
    var warn = false;
    return new Promise(function (resolve, reject) {
        _.each(data, function (collData, collName) {
            collData = _.map(collData, function (elem) {
                var subtract = {}
                _.each(options[collName], function (field) {
                    if (collName === 'performance_timeline') {
                        var finish = '_finish';
                        if (/aomanual/.test(field)) {
                            finish = '_query_end2';
                        }
                        subtract[field] = {
                            '50': elem['/manage/plan'][field + finish]['50'] - elem['/manage/plan'][field + '_start']['50'],
                            '80': elem['/manage/plan'][field + finish]['80'] - elem['/manage/plan'][field + '_start']['80'],
                            '95': elem['/manage/plan'][field + finish]['95'] - elem['/manage/plan'][field + '_start']['95'],
                            'count': elem['/manage/plan'][field + finish]['count'],
                            'average': elem['/manage/plan'][field + finish]['average'] - elem['/manage/plan'][field + '_start']['average']
                        };
                    }
                    else {
                        subtract[field] = elem[field];
                    }
                });
                return _.extend(subtract, {recordTimestamp: elem.recordTimestamp});
            });
            getMailContent(collData, collName, warnResult, isWarning);
        });
        if (isWarning.length > 0) {
            warn = true;
        }
        resolve({
            warn: warn,
            result: {
                warnResults: warnResult
            }
        });
    });
}

/**
 * @description 根据报警规则处理
 * @param {array} data 要处理的数据
 * @return {Promise}
 * @author wujianwei01@baidu.com
 */
function getMailContent (datas, collName, warnResult, isWarning) {
    if (!_.isArray(datas) && datas.length < 8) {
        return;
    }
    _.each(options[collName], function (field) {
        var allData = [];
        var continusData = [];
        data = datas.slice(datas.length - 8);
        _.each(datas, function (elem, index) {
            allData.push(elem[field]['95']);
            if (index >= datas.length - 8) {
                continusData.push(elem[field]['95']);
            }
        });
        var lastestSevenAvg = getAvg(continusData.slice(1));
        var lastSevenAvg = getAvg(continusData.slice(0, 7));
        if (field in expect) {
            formatRuleData(continusData[7], expect[field], collName, field, warnResult.gtExpect);
            warnResult.gtExpect.keys = formatKeys(data[7].recordTimestamp, '期望值');
            if (continusData[7] > expect[field]) {
                isWarning.push(true);
            }
        }
        if (collName === 'performance_timeline') {
            field += '首屏加载时间';
        }
        formatRuleData(continusData[7], continusData[6], collName, field, warnResult.gtLast);
        warnResult.gtLast.keys = formatKeys(data[7].recordTimestamp, data[6].recordTimestamp);
        if (continusData[7] / continusData[6] > threshold.single) {
            isWarning.push(true);
        }

        formatRuleData(lastestSevenAvg, lastSevenAvg, collName, field, warnResult.gtContinusAvg);
        warnResult.gtContinusAvg.keys = formatKeys(data[1].recordTimestamp,
                data[0].recordTimestamp,
                data[7].recordTimestamp,
                data[6].recordTimestamp);

        if (lastestSevenAvg / lastSevenAvg > threshold.avg) {
            isWarning.push(true);
        }
        var variance = getVariance(continusData, lastestSevenAvg, lastSevenAvg);
        formatRuleData(variance.lastestSd, variance.lastSd, collName, field, warnResult.gtContinusVariance);
        warnResult.gtContinusVariance.keys = formatKeys(data[1].recordTimestamp,
                data[0].recordTimestamp,
                data[7].recordTimestamp,
                data[6].recordTimestamp);

        if (variance.lastestSd / variance.lastSd > threshold.sd) {
            isWarning.push(true);
        }
        var lastWeekData = allData.slice(0, 7);
        var currentWeekData = allData.slice(7);

        formatRuleData(getAvg(currentWeekData), getAvg(lastWeekData), collName, field, warnResult.gtLastWeek);
        warnResult.gtLastWeek.keys = formatKeys(datas[7].recordTimestamp,
                datas[0].recordTimestamp,
                datas[datas.length - 1].recordTimestamp,
                datas[6].recordTimestamp);

        if (getAvg(currentWeekData) / getAvg(lastWeekData) > threshold.avg) {
            isWarning.push(true);
        }
    });
}
/**
 * @description 生成表头中显示的key值
 * @param {number} data1 时间戳
 * @param {number|string} data2 时间戳或者字符串
 * @param {number} data3 时间戳
 * @param {number} data4 时间戳
 * @return {Array} 
 * @author wujianwei01@baidu.com
 */
function formatKeys (data1, data2, data3, data4) {
    var key1 = md(data1).strftime('%Y/%m/%d');
    if (data3) {
        key1 += '~' + md(data3).strftime('%Y/%m/%d');
    }
    var key2 = '';
    if (typeof data2 === 'string') {
        key2 = data2;
    }
    else {
        key2 = md(data2).strftime('%Y/%m/%d');
    }
    if (data4) {
        key2 += '~' + md(data4).strftime('%Y/%m/%d');
    }
    return [].concat(key1, key2, '比值')
}

/**
 * @description 将对应规则的数据存到对应的规则对象下
 * @param {number} newData 最新的数据
 * @param {number} lastData 需要比较的数据
 * @param {string} collName 需要记录的页面
 * @param {string} field 对应的属性名
 * @param {object} rule 对应的规则对象
 * @author wujianwei01@baidu.com
 */
function formatRuleData (newData, lastData, collName, field, rule) {
    newData = fixed2Data(newData, 2);
    lastData = fixed2Data(lastData, 2);
    var getCollName = getCollNameInRule(collName, rule);
    if (getCollName.isExist === true) {
        rule.value[getCollName.index].value.push(formatShowValue(newData, lastData, field));
        rule.value[getCollName.index].length = rule.value[getCollName.index].value.length;
    }
    else {
        var out = {};
        out.value = [];
        out.collName = collName;
        out.value.push(formatShowValue(newData, lastData, field));
        out.length = out.value.length;
        rule.value.push(out);
    }
}

/**
 * @description 若collName已存在rule对象中，返回在rule中的index
 * @param {string} collName 需要记录的页面
 * @param {object} rule 对应规则对象 
 * @return {object} res 是否存在,若存在加上对应的index值
 * @author wujianwei01@baidu.com
 */
function getCollNameInRule(collName, rule) {
    var res = {
        isExist: false
    };
    if (_.isEmpty(rule.value)) {
        return res;
    }
    _.each(rule.value, function (collData, index) {
        if (collName === collData.collName) {
            res.isExist = true;
            res.index = index;
            return;
        }
    })
    return res;
}
/**
 * @description 规范显示的数据值
 * @param {number} newData 最新的数据
 * @param {number} lastData 需要比较的数据
 * @param {string} field 对应的属性 
 * @return {object}
 * @author wujianwei01@baidu.com
 */

function formatShowValue (newData, lastData, field) {
    var color = 'green';
    var greatOrLess = '↓ ';
    if (newData > lastData) {
        color = 'red';
        greatOrLess = '↑ ';
    }
    greatOrLess += fixed2Data(Math.abs((newData - lastData) / lastData) * 100, 2) + '%';
    return {
        field: field,
        color: color,
        value: [newData, lastData, greatOrLess]
    }
}
/**
 * @description 获得数据的均值
 * @param {array} data 存放数据的数组
 * @return {number} 平均值
 * @author wujianwei01@baidu.com
 */
function getAvg(data) {
    var avg = 0;
    var sum = 0;
    _.each(data, function (elem, index) {
        sum += elem;
        if (index === data.length - 1) {
            avg = sum / (index + 1);
        }
    })
    return fixed2Data(avg, 2);
}
/**
 * @description 获取连续7天的方差和标准差
 * @param {array} datas 连续8天的数据
 * @return {Object} 包含方差和标准查的对象
 * @author wujianwei01@baidu.com
 */

function getVariance(datas, lastestAvg, lastAvg) {
    var lastestVariance = 0;
    var lastVariance = 0;
    _.each(datas.slice(1), function (data, index) {
        lastestVariance += Math.pow((data - lastestAvg), 2);
        if (index === 6) {
            lastestVariance /= index + 1;
        }
    });
    _.each(datas.slice(0, 7), function (data, index) {
        lastVariance += Math.pow((data - lastAvg), 2);
        if (index === 6) {
            lastVariance /= index + 1;
        }
    });
    return {
        lastestVariance: fixed2Data(lastestVariance, 2),
        lastestSd: fixed2Data(Math.sqrt(lastestVariance), 2),
        lastVariance: fixed2Data(lastVariance, 2),
        lastSd: fixed2Data(Math.sqrt(lastVariance), 2)
    }
}
/**
 * @description 获取数据库中对应时间段的数据
 * @param {object} options 需要获取的数据的collection和field
 * @param {object} db mongodb
 * @return {Promise}
 * @author wujianwei01@baidu.com
 */
exports.getDataInDb = function (db) {
    return new Promise(function (resolve, reject) {
        var data = {};
        var endDate = md.fn.strptime(md().add('d', -1).strftime('%Y%m%d'), '%Y%m%d');
        var date = md.fn.strptime(md().strftime('%Y%m%d'), '%Y%m%d');
        var startDate = {};
        if (date.day() === 6) {
            startDate = date.day(-7).day(5);
        }
        else {
            startDate = date.day(-7).day(-7).day(5);
        }
        var cmd = {recordTimestamp: {'$gte': +startDate, '$lte': +endDate}};
        Promise.all(
            _.map(options, function (elem, collName) {
                return toArray(db, collName, cmd, data);
            })
        )
        .then(function () {
            resolve(data);
        });
    });
}

/**
 * @description 将获得的数据转为数组
 * @param {object} db mongodb
 * @param {string} collName 集合名
 * @param {string} cmd 查找数据的命令
 * @param {object} data 存储数组的对象
 * @return {Promise}
 * @author wujianwei01@baidu.com
 */

function toArray(db, collName, cmd, data) {
    return new Promise(function (resolve, reject) {
        var coll = db.collection(collName);
        coll.find(cmd).toArray(function (err, docs) {
            if (err) {
                reject();
            }
            else {
                data[collName] = _.sortBy(docs, 'recordTimestamp');
                resolve();
            }
        })
    })
}

/**
 * @description send mail
 * @param {array} mailContent
 * @return {Promise}
 * @author wujianwei01@baidu.com
 */
exports.sendMail = function (message) {
    return new Promise (function (resolve, reject) {
        var from = 'fc-fe@baidu.com';
        var to = ' liangjinping@baidu.com  hanbingfeng@baidu.com  fcfe-inf@baidu.com  -c liuzeyin@baidu.com,liangjinping@baidu.com,fcfe-mgt@baidu.com';
        var subject = '"$(echo -e "' + md().strftime('%Y/%m/%d')
            + '[fcfe-inf]dashboard Warning\\nMIME-Version:1.0\\nContent-Type:text/html;charset=utf8")"';
        var cmd = 'echo \"' + message + '\"'  + ' | mail -s ' + subject + to + ' -- -f ' + from;
        var send = childProcess.exec(cmd);
        send.on('close', function (code) {
            if (0 !== code) {
                reject(code);
            }
            resolve({
                warn: true,
                code: code
            });
        });
    })
}

if (require.main === module) {
    return connectDb(config['db-url']).then(function (db) {
        return exports.run(db, './bin/mailTpl.tpl').then(
            function (warns) {
                console.info(warns);
            },
            function (ret) {
                console.trace(ret, ret.stack);
            }
        ).then(
            function () {
                db.close();
            },
            function () {
                db.close();
            }
        );
    });
}
