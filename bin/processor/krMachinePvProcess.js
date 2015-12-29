/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file 处理log平台ID为 xiezhengzong_kr_cmdno5_filter 的 日志
 * @author Yao tang<tangguangyao@baidu.com>
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

        if (jobname.indexOf('xiezhengzong_kr_cmdno5_filter') > -1) {
            var isHourly = jobname.indexOf('_hourly') > 0;

            var dataAry = line.split('\t');
            var attrAry = ['userid', 'FePV', 'cmdnoPv', 'filterPV'];

            for (var i = 0, len = dataAry.length; i < len; i++) {
                info[attrAry[i]] = dataAry[i];
            }
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
                fePv: 0,
                filterPV: 0,
                recordTimestamp: logAry[0].timestamp
            };
            _.each(logAry, function (item, i) {
                record.fePv = record.fePv + item.FePV;
                record.filterPV = record.filterPV + item.filterPV;
            });

            return record;
        };

        if (this.logs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'xiezhengzong_kr_cmdno5_filter', [parseLog(this.logs)])
            );
        }

        if (this.hourlyLogs.length) {
            var logData = _.groupBy(this.hourlyLogs, 'hour');
            var docs = [];

            _.each(logData, function (item, key) {
                var doc = parseLog(item);
                var td = new Date();
                td.setTime(Number(doc.recordTimestamp));
                td.setHours(Number(key));
                td.setMinutes(0);
                doc.recordTimestamp = td.getTime();

                docs.push(doc);
            });

            pendingJobs.push(
                this.updateLogs(db, 'xiezhengzong_kr_cmdno5_filter_hourly', docs)
            );
        }

        Promise.all(pendingJobs).then(
            function (results) {
                console.info('[info]', 'krMachinePvProcess done');
                Processor.prototype.done.apply(me, args);
            },
            function (results) {
                console.error('[error]', 'krMachinePvProcess fail');
                Processor.prototype.done.apply(me, args);
            }
        );
    }
});

