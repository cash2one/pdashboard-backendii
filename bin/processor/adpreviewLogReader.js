/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file logReader
 * @author Pride Leong<lykling.lyk@gmail.com>
 */
/* eslint-env node */

var fs = require('fs-extra');
var readline = require('readline');
var moment = require('moment-datetime');
var _ = require('underscore');
var Processor = require('./Processor');

module.exports = new Processor({
    start: function (options) {
        var me = this;
        Processor.prototype.start.apply(me, arguments);
        var context = me.getContext();
        var args = context.args;
        var config = context.config;

        args = _.filter(args, function (arg) {
            var opts = arg.opts;
            return /^fcapi_preview_brief|preview_ban_count/.test(opts.jobname);
        });
        // console.log('[debug]', '[processor:logReader][start]', 'context:', context);
        // console.log('[debug]', '[processor:logReader][start]', 'args:', args);
        // console.log('[debug]', '[processor:logReader][start]', 'config:', config);
        Promise.all(_.map(args, function (result) {
            return Promise.all(_.map(result.pathes, function (path) {
                return new Promise(function (resolve, reject) {
                    var timestamp = +moment.fn.strptime(path.split('/').slice(-3, -1).join(' '), '%Y%m%d %H%M');
                    var jobname = path.split('/').slice(-4)[0];
                    var jobconf = _.detect(
                        [].concat(config['watching-list'], config['watching-list-hourly']),
                        _.matches({name: jobname})
                    );
                    // console.log('[debug]', '[processor:logReader][start]', 'timestamp:', timestamp);
                    // console.log('[debug]', '[processor:logReader][start]', 'jobname:', jobname);
                    // console.log('[debug]', '[processor:logReader][start]', 'jobconf:', jobconf);
                    var savedpath = config['data-path'] + '/' + path.split('/').slice(-4).join('/');
                    var rd = readline.createInterface({
                        input: fs.createReadStream(savedpath),
                        output: process.stdout,
                        terminal: false
                    });
                    rd.on('line', function (line) {
                        me.emit('line', {
                            data: line,
                            path: path,
                            timestamp: timestamp,
                            period: jobconf.period
                        });
                    }).on('close', function () {
                        resolve();
                    }).on('SIGINT', function (evt) {
                        // Here, sigint should be handled
                        reject();
                    });
                });
            }));
        })).then(
            function () {
                console.info('[info] logReader done');
                me.emit('end', {
                    processor: me,
                    data: {}
                });
            },
            function () {
                console.error('[error] logReader fail');
                me.emit('end', {
                    processor: me,
                    data: {}
                });
            }
        );
    },
    handler: _.noop,
    finish: _.noop
});
