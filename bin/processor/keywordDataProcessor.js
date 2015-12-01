/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file keywordDataProcessor
 * @author Pride Leong<lykling.lyk@gmail.com>
 */
/* eslint-env node */

var _ = require('underscore');
var Processor = require('./Processor');

function cover2document(logs) {
    var list = _.groupBy(logs, 'timestamp');
    return _.chain(list).map(function (list, timestamp) {
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
        }).extend({
            recordTimestamp: +timestamp
        }).value();
    }).flatten().value();
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
        if (/^\/manage\/keyword$/.test(info.path)
            && /performance_jsonlog_nirvanaII/.test(jobname)
            && (info.item === 'performance_newAomanual_query_end_2'
                || (!(/performance_emanage/.test(info.target))
                    && info.target === info.item))
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
                this.updateLogs(db, 'performance_keywordii_basic', cover2document(this.logs))
            );
        }
        if (this.hourlyLogs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'performance_keywordii_basic_hourly', cover2document(this.hourlyLogs))
            );
        }
        Promise.all(pendingJobs).then(
            function (results) {
                Processor.prototype.done.apply(me, args);
            },
            function (results) {
                Processor.prototype.done.apply(me, args);
            }
        );
    }
});

