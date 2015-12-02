/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file emanageDataProcessor
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
        // 2015-11-20 00:00
        var timestampOfLogOutputChanged = 1447948800000;
        // 2015-11-24 00:00
        // var timestampOfLogOutputChanged = 1448294400000;
        // console.log('[debug]', '[processor:emanageDataProcessor][handler]',
        //     'timestamp', evt.timestamp,
        //     'output changed:', timestampOfLogOutputChanged,
        //     'smaller:', evt.timestamp < timestampOfLogOutputChanged);
        if (/^\/overview\/index$/.test(info.path)
            && ((evt.timestamp < timestampOfLogOutputChanged
                    && /performance_jsonlog_nirvana_/.test(jobname)
                    && (/^performance_emanage/.test(info.target)
                        || /^performance_static$/.test(info.item))
                    && info.target === info.item)
               || (evt.timestamp > timestampOfLogOutputChanged
                   && ((/^performance_emanage/.test(info.target)
                            && info.target === info.item
                            && /performance_jsonlog_nirvana_/.test(jobname))
                       || (info.target === 'performance_static')
                            && info.item === 'performance_static'
                            && /performance_jsonlog_nirvanaII/.test(jobname))))
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
                this.updateLogs(
                    db,
                    'performance_emanage_basic',
                    cover2document(this.logs),
                    {merge: true}
                )
            );
        }
        if (this.hourlyLogs.length) {
            pendingJobs.push(
                this.updateLogs(
                    db,
                    'performance_emanage_basic_hourly',
                    cover2document(this.hourlyLogs),
                    {merge: true}
                )
            );
        }
        // console.log('[debug]', '[processor:emanageDataProcessor][done]',
        //    'logs.length', this.logs.length, 'hourly logs.length:', this.hourlyLogs.length);
        Promise.all(pendingJobs).then(
            function (results) {
                console.info('[info]', 'emanageDataProcessor done');
                Processor.prototype.done.apply(me, args);
            },
            function (results) {
                console.error('[error]', 'emanageDataProcessor fail', results);
                Processor.prototype.done.apply(me, args);
            }
        );
    }
});

