/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file timelineDataProcessor
 * @author Pride Leong<lykling.lyk@gmail.com>
 */
/* eslint-env node */

var _ = require('underscore');
var Processor = require('./Processor');

function cover2document(logs) {
    // console.log('[debug]', 'timeline logs:', logs.slice(0, 3));
    var list = _.groupBy(logs, 'timestamp');
    var result = _.chain(list).map(function (list, timestamp) {
        return _.chain(list).groupBy('path').mapObject(function (list) {
            return _.chain(list).map(function (info) {
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
        }).extend({
            recordTimestamp: +timestamp
        }).value();
    }).flatten().value();
    // console.log('[debug]', 'timeline docs:', result.slice(0, 3));
    return result;
}

module.exports = new Processor({
    start: function (options) {
        Processor.prototype.start.apply(this, arguments);
        this.logs = [];
        this.hourlyLogs = [];
    },
    handler: function (evt) {
        var line = evt.data;
        var path = evt.path;
        var info = JSON.parse(line);
        var jobname = path.split('/').slice(-4)[0];
        if (info.target === 'timeline'
            && /performance_jsonlog_nirvanaII/.test(jobname)
            && !/\./.test(info.path)
        ) {
            info.timestamp = evt.timestamp;
            if (evt.period === 'hourly') {
                this.hourlyLogs.push(info);
            }
            else {
                this.logs.push(info);
            }
            this.emit('line', {
                data: info,
                path: path,
                period: evt.period
            });
        }
    },
    finish: function (evt) {
    },
    done: function (evt) {
        var me = this;
        var args = arguments;
        var context = me.getContext();
        var db = context.db;
        var pendingJobs = [];
        if (this.logs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'performance_timeline', cover2document(this.logs))
            );
        }
        if (this.hourlyLogs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'performance_timeline_hourly', cover2document(this.hourlyLogs))
            );
        }
        Promise.all(pendingJobs).then(
            function (results) {
                console.info('[info]', 'timelineDataProcessor done');
                Processor.prototype.done.apply(me, args);
            },
            function (results) {
                console.error('[error]', 'timelineDataProcessor fail', results);
                Processor.prototype.done.apply(me, args);
            }
        );
    }
});

