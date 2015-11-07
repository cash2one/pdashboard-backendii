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
            start: function () {
                this.logs = [];
            },
            handler: function (evt) {
                var line = evt.data;
                var info = JSON.parse(line);
                this.logs.push(info);
                this.emit('line', {data: line});
            },
            finish: function (evt) {
                var me = this;
                var logs = _.groupBy(this.logs, function (info) {
                    return info.path;
                });
                var docs = [];
                var adpreviewColl;
                if (opts.jobname === 'fengchao_feview_pv_jsonlog_adpreview_json') {
                    docs = _.map(this.logs, function (item) {
                        return _.extend({
                            recordTimestamp: recordTimestamp
                        }, item);
                    });

                    adpreviewColl = db.collection('adpreview_frontend_response_pv_hourly');
                    adpreviewColl.remove({recordTimestamp: recordTimestamp}, function (err, result) {
                        adpreviewColl.insert(docs, function (err, result) {
                            me.emit('end', {});
                        });
                    });
                }

                if (opts.jobname === 'fengchao_feview_uv_jsonlog_adpreview_json') {
                    docs = _.map(this.logs, function (item) {
                        return _.extend({
                            recordTimestamp: recordTimestamp
                        }, item);
                    });
                    adpreviewColl = db.collection('adpreview_frontend_response_uv_hourly');
                    adpreviewColl.remove({recordTimestamp: recordTimestamp}, function (err, result) {
                        adpreviewColl.insert(docs, function (err, result) {
                            me.emit('end', {});
                        });
                    });
                }
            }
        })
    };
};
