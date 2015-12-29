/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file 处理log平台ID为 fengchao_feview_pv_jsonlog_kr_search 的 日志
 * @author Yao Tang<tanggaungyao@baidu.com>
 */
/* eslint-env node */

var _ = require('underscore');
var Processor = require('./Processor');

module.exports = new Processor({
    start: function (options) {
        Processor.prototype.start.apply(this, arguments);
        this.logs = [];
        this.hourlyLogs = [];
    },
    handler: function (evt) {
        var line = evt.data;
        var path = evt.path;
        var info = {};
        var jobname = path.split('/').slice(-4)[0];

        if (jobname.indexOf('fengchao_feview_pv_jsonlog_kr_search') > -1) {
            var isHourly = jobname.indexOf('_hourly') > 0;

            info = JSON.parse(line);
            info.timestamp = evt.timestamp;

            this[isHourly ? 'hourlyLogs' : 'logs'].push(info);
        }

        this.emit('line', {
            data: info,
            path: path,
            period: evt.period
        });
    },
    finish: function (evt) {
    },
    done: function (evt) {
        var me = this;
        var args = arguments;
        var context = me.getContext();
        var db = context.db;
        var pendingJobs = [];

        var parseLog = function (logAry) {
            var record = {
                recordTimestamp: logAry[0].timestamp,
                pv: logAry[0].pv
            };
            return record;
        };

        if (this.logs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'fengchao_feview_pv_jsonlog_kr_search', [parseLog(this.logs)])
            );
        }

        if (this.hourlyLogs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'fengchao_feview_pv_jsonlog_kr_search_hourly', [parseLog(this.hourlyLogs)])
            );
        }

        Promise.all(pendingJobs).then(
            function (results) {
                console.info('[info]', 'krFePvProcess done');
                Processor.prototype.done.apply(me, args);
            },
            function (results) {
                console.error('[error]', 'krFePvProcess fail');
                Processor.prototype.done.apply(me, args);
            }
        );
    }
});

