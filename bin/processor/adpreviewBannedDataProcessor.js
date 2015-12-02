/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file adpreviewUVDataProcessor
 * @author Pride Leong<lykling.lyk@gmail.com>
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

        if (jobname.indexOf('preview_ban_count') > -1) {
            var lineDataAry = line.split('\t');

            info.reason = lineDataAry[0];
            info.count = lineDataAry[1];
            info.timestamp = evt.timestamp;

            this[jobname.indexOf('_hourly') > 0 ? 'hourlyLogs' : 'logs'].push(info);
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
            var BAN_REASON = {quota: '8501', frequency: '8904'};
            var record = {bannedForQuota: 0, bannedForFreq: 0};

            _.each(logAry, function (info) {
                var isQuota = info.reason === BAN_REASON.quota;
                record[isQuota ? 'bannedForQuota' : 'bannedForFreq'] = info.count;
                record.recordTimestamp = info.timestamp;
            });

            return record;
        };

        if (this.logs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'preview_ban_count', [parseLog(this.logs)])
            );
        }

        if (this.hourlyLogs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'preview_ban_count_hourly', [parseLog(this.hourlyLogs)])
            );
        }

        Promise.all(pendingJobs).then(
            function (results) {
                console.info('[info]', 'adpreviewBannedDataProcessor done');
                Processor.prototype.done.apply(me, args);
            },
            function (results) {
                console.error('[error]', 'adpreviewBannedDataProcessor fail');
                Processor.prototype.done.apply(me, args);
            }
        );
    }
});

