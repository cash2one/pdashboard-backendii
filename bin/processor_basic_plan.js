/**
 *
 * @file basic_plan.sh改写
 * @author
 */

var fs = require('fs-extra');
var readline = require('readline');
var Processor = require('./Processor');
var _ = require('underscore');
var insertDataInDb = require('./db.js').insertDataInDb;

exports.basicPlanIndex = function (opts, db) {
    var  recordTimestamp = opts.recordTimestamp;
    return {
        basicPlanReader: new Processor({
            start: function () {
                var me = this;
                var rd = readline.createInterface({
                    input: fs.createReadStream(opts.destination),
                    output: process.stdout,
                    terminal: false
                });
                rd.on('line', function (line) {
                    me.emit('line', {data: line});
                }).on('close', function () {
                    me.emit('end', {});
                });
            },
            handler: _.noop,
            finish: _.noop
        }),
        basicPlanSpliter: new Processor({
            start: function () {
                this.logs = [];
            },
            handler: function (evt) {
                var line = evt.data;
                var info = JSON.parse(line);
                this.logs.push(info);
                this.emit('line', {data: line});
            },
            finish: function (evt) {
                var me = this;
                var logs = _.groupBy(this.logs, function (info) {
                    return info.path;
                });
                var docs = [];
                var adpreviewColl;
                if (opts.jobname === 'fengchao_feview_pv_jsonlog_adpreview_json') {
                    docs = _.map(this.logs, function (item) {
                        return _.extend({
                            recordTimestamp: recordTimestamp
                        }, item);
                    });
                    adpreviewColl = db.collection('adpreview_frontend_response_pv');
                    adpreviewColl.remove({recordTimestamp: recordTimestamp}, function (err, result) {
                        adpreviewColl.insert(docs, function (err, result) {
                            me.emit('end', {});
                        });
                    });
                }
                else if (opts.jobname === 'fengchao_feview_uv_jsonlog_adpreview_json') {
                    docs = _.map(this.logs, function (item) {
                        return _.extend({
                            recordTimestamp: recordTimestamp
                        }, item);
                    });
                    adpreviewColl = db.collection('adpreview_frontend_response_uv');
                    adpreviewColl.remove({recordTimestamp: recordTimestamp}, function (err, result) {
                        adpreviewColl.insert(docs, function (err, result) {
                            me.emit('end', {});
                        });
                    });
                }
                var timeline = {};
                _.each(logs, function (list, path, log) {
                    var collection;
                    var basic = list;
                    if (/^\/manage\/plan$/.test(path) && /II/.test(opts.jobname)) {
                        collection = 'performance_plan_basic';
                    }
                    else if (/^\/manage\/keyword$/.test(path)) {
                        if (/nirvanaII/.test(opts.jobname)) {
                            collection = 'performance_keywordii_basic';
                        }
                        else if (/niravana/.test(opts.jobname)) {
                            collection = 'performance_keyword_basic';
                        }
                    }
                    else if (/^\/overview\/index$/.test(path) && !(/II/.test(opts.jobname))) {
                        collection = 'performance_emanage_basic';
                    }
                    if (collection) {
                        if (collection !== 'performance_emanage_basic') {
                            // nirvanaII 中取plan_basic 和 keywordii
                            basic = _.filter(basic, function (info) {
                                return (info.item === 'performance_newAomanual_query_end_2') ||
                                (!(/performance_emanage/.test(info.target)) && info.target === info.item);
                            });
                        }
                        else {
                            // nirvana 中取emanage
                            basic = _.filter(basic, function (info) {
                                return (/^performance_emanage/.test(info.target) ||
                                    /^performance_static$/.test(info.item))
                                    && info.target === info.item;
                            });
                        }
                        basic = _.chain(basic).map(function (info) {
                            return {
                                50: parseFloat(info.t50),
                                80: parseFloat(info.t80),
                                95: parseFloat(info.t95),
                                count: parseFloat(info.pv),
                                average: parseFloat(info.average),
                                item: info.item
                            };
                        }).indexBy('item').each(function (info) {
                            delete info.item;
                        }).value();

                        basic.recordTimestamp = recordTimestamp;
                        if (opts.period === 'hourly') {
                            collection  += '_hourly';
                        }
                        var coll = db.collection(collection);
                        coll.remove({recordTimestamp: recordTimestamp}, function (err, result) {
                            coll.insert([basic], function (err, result) {
                                if (/performance_emanage_basic/.test(collection)) {
                                    me.emit('end', {});
                                }
                            });
                        });
                    }

                    timeline[path] = _.filter(list, function (info) {
                        return info.target === 'timeline';
                    });
                    if (timeline[path].length) {
                        timeline[path] = _.chain(timeline[path]).map(function (info) {
                            return {
                                50: parseFloat(info.t50),
                                80: parseFloat(info.t80),
                                95: parseFloat(info.t95),
                                count: parseFloat(info.pv),
                                average: parseFloat(info.average),
                                item: info.item
                            };
                        }).indexBy('item').each(function (info) {
                            delete info.item;
                        }).value();
                    }
                    else {
                        delete timeline[path];
                    }
                });
                if (!_.isEmpty(timeline, {})) {
                    timeline.recordTimestamp = recordTimestamp;
                    var timeCollName = 'performance_timeline';
                    if (opts.period === 'hourly') {
                        timeCollName += '_hourly';
                    }
                    var timeColl = db.collection(timeCollName);
                    timeColl.remove({recordTimestamp: recordTimestamp}, function (err, result) {
                        timeColl.insert([timeline], function (err, result) {
                            me.emit('end', {});
                        });
                    });
                }
            }
        })
    };
};
