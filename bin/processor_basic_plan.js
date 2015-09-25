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
            start: function() {
                    this.logs = [];
            },
            handler: function (evt) {
                var line = evt.data;
                var info = JSON.parse(line);
                this.logs.push(info);
                this.emit('line', {data: line});
            },
            finish: function (evt) {
                if (opts.period === 'hourly') {
                    return;
                }
                var logs = _.groupBy(this.logs, function (info) {
                    return info.path;
                });
                var timeline = {};
                _.each(logs, function (list, path, log) {
                    var collection;
                    var basic = list;
                    if (/^\/manage\/plan$/.test(path)) {
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
                    if (collection) {
                        if (/II/.test(opts.jobname)) {
                            // nirvanaII 中取plan_basic 和 keywordii
                            basic = _.filter(basic, function(info) {
                                return !(/performance_emanage/.test(info.target)) && info.target === info.item;
                            });
                        }
                        else {
                            // nirvana 中取emanage
                            basic = _.filter(basic, function (info) {
                                return (/^performance_emanage/.test(info.target) ||
                                    /^performance_static$/.test(info.item))
                                    && info.target === info.item;
                            });
                            collection = 'performance_emanage_basic';
                        }
                        basic = _.chain(basic).map(function (info) {
                            return {
                                50: info.t50,
                                80: info.t80,
                                95: info.t95,
                                count: info.pv,
                                average: info.average,
                                item: info.item
                            }
                        }).indexBy('item').each(function (info) {
                            delete info.item;
                        }).value();

                        basic.recordTimestamp = recordTimestamp;
                        console.log(basic, 'fafsfsa');
                        insertDataInDb(db, collection, basic);
                    }

                    timeline[path] = _.filter(list, function (info) {
                        return info.target === 'timeline';
                    });
                    if (timeline[path].length) {
                        timeline[path] = _.chain(timeline[path]).map(function (info) {
                            return {
                                50: info.t50,
                                80: info.t80,
                                95: info.t95,
                                count: info.pv,
                                average: info.average,
                                item: info.item
                            }
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
                    //console.log(_.keys(timeline).length, recordTimestamp);
                    insertDataInDb(db, 'performance_timeline', timeline);
                }
                this.emit('end', {});
            }
        })
    }
};
