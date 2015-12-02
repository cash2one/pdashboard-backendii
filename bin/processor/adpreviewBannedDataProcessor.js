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

        if (jobname === 'preview_ban_count') {
            var lineDataAry = line.split('\t');

            info.reason = lineDataAry[0];
            info.count = lineDataAry[1];
            info.timestamp = evt.timestamp;

            this.logs.push(info);
        }

        if (jobname === 'preview_ban_count_hour') {

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
        var record;

        if (this.logs.length) {
            var BAN_REASON = {quota: '8501', frequency: '8904'};
            record = {bannedForQuota: 0, bannedForFreq: 0};

            _.each(this.logs, function (info) {
                var isQuota = info.reason === BAN_REASON.quota;
                record[isQuota ? 'bannedForQuota' : 'bannedForFreq'] = info.count;
                record.recordTimestamp = info.timestamp;
            });

            pendingJobs.push(
                this.updateLogs(db, 'preview_ban_count_daily', [record])
            );
        }

        // if (this.hourlyLogs.length) {
        //     pendingJobs.push(
        //         this.updateLogs(db, 'adpreview_frontend_response_uv_hourly', cover2document(this.hourlyLogs))
        //     );
        // }
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

