/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file 处理log平台ID为 fcapi_preview_brief 的 日志
 * @author Huang Jinsheng<huangjinshengk@baidu.com>
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
        // if (/fengchao_feview_uv_jsonlog_adpreview_json/.test(jobname)
        // ) {
        //     info.timestamp = evt.timestamp;
        //     if (evt.period === 'hourly') {
        //         this.hourlyLogs.push(info);
        //     }
        //     else {
        //         this.logs.push(info);
        //     }
        // }

        if (jobname === 'fcapi_preview_brief_hour') {

        }

        if (jobname === 'fcapi_preview_brief') {
            var dataAry = line.split('\t');
            var attrAry = ['device', 'seoFlag', 'pv', 'uv', 'tokenCount', 'succCount', 'succRate'];

            for (var i = 0, len = dataAry.length; i < len; i++) {
                info[attrAry[i]] = dataAry[i];
            }
            info.timestamp = evt.timestamp;

            this.logs.push(info);
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
        var record = {};

        if (this.logs.length) {
            _.each(this.logs, function (item, i) {
                var attrName = item.device.toLowerCase() + '_' + item.seoFlag;
                record.recordTimestamp = item.timestamp;
                delete item.timestamp;
                record[attrName] = item;
            });

            pendingJobs.push(
                this.updateLogs(db, 'fcapi_preview_brief_daily', [record])
            );
        }

        // if (this.hourlyLogs.length) {
        //     pendingJobs.push(
        //         this.updateLogs(db, 'adpreview_frontend_response_uv_hourly', cover2document(this.hourlyLogs))
        //     );
        // }
        Promise.all(pendingJobs).then(
            function (results) {
                console.info('[info]', 'adpreviewFcApiDataProcessor done');
                Processor.prototype.done.apply(me, args);
            },
            function (results) {
                console.error('[error]', 'adpreviewFcApiDataProcessor fail');
                Processor.prototype.done.apply(me, args);
            }
        );
    }
});

