/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file adpreviewUVDataProcessor
 * @author Pride Leong<lykling.lyk@gmail.com>
 */
/* eslint-env node */

var _ = require('underscore');
var Processor = require('./Processor');

function cover2document(logs) {
    var list = _.groupBy(logs, 'timestamp');
    return _.chain(list).map(function (list, timestamp) {
        return _.chain(list).map(function (info) {
            return _.extend(_.omit(info, 'timestamp'), {
                recordTimestamp: +timestamp
            });
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
        var jobname = path.split('/').slice(-4)[0];
        var info = {};
        // console.log('[debug]', '[processor:adpreviewUVDataProcessor][line-handler]', 'jobname:', jobname);
        if (/fengchao_feview_uv_jsonlog_adpreview_json/.test(jobname)
        ) {
            info = JSON.parse(line);
            :.timestamp = evt.timestamp;
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
                this.updateLogs(db, 'adpreview_frontend_response_uv', cover2document(this.logs))
            );
        }
        if (this.hourlyLogs.length) {
            pendingJobs.push(
                this.updateLogs(db, 'adpreview_frontend_response_uv_hourly', cover2document(this.hourlyLogs))
            );
        }
        Promise.all(pendingJobs).then(
            function (results) {
                console.info('[info]', 'adpreviewUVDataProcessor done');
                Processor.prototype.done.apply(me, args);
            },
            function (results) {
                console.error('[error]', 'adpreviewUVDataProcessor fail');
                Processor.prototype.done.apply(me, args);
            }
        );
    }
});

