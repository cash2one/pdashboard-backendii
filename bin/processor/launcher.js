/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file launcher.js
 * @author Pride Leong<lykling.lyk@gmail.com>
 */
/* eslint-env node */

var processorIndex = require('./index');
var Processor = require('./Processor');
var _ = require('underscore');

exports.launch = function (map, args, opts) {
    return new Promise(function (resolve, reject) {
        var done = new Processor({
            start: _.noop,
            handler: _.noop,
            finish: _.noop,
            done: resolve
        });
        var index = _.extend({}, processorIndex);
        map.done = {
            up: [],
            down: []
        };
        _.each(map, function (conf, name, ctx) {
            if (conf.down.length === 0 && name !== 'done') {
                conf.down.push('done');
                ctx.done.up.push(name);
            }
        });
        index.done = done;
        var tag = {};
        // console.log('[debug]', 'processorMap:', map);

        /**
         * 利用后序遍历的思路处理map中的流程
         * 先将所有叶子注册事件
         * 最后运行根节点的start
         * @param {string} current the name of current processor
         */
        function start(current) {
            // 已经启动过，不处理
            if (tag[current]) {
                return;
            }
            console.info('[info]', 'starting processor:', current);
            var inst = index[current];
            _.each(map[current].down, function (down) {
                start(down);
            });
            inst.done = _.after(map[current].up.length, _.bind(_.once(inst.done), inst));
            _.each(map[current].up, function (up) {
                var upInst = index[up];
                // console.log('[debug]', 'inst:', current, 'upInst:', up, upInst);
                upInst.on('line', _.bind(inst.handler, inst));
                upInst.on('end', _.bind(inst.finish, inst));
                upInst.on('end', inst.done);
            });
            inst.start({
                context: {
                    args: args,
                    db: opts.db,
                    config: opts.config
                }
            });
            tag[current] = true;
            console.info('[info]', 'processor', current, 'started');
        }
        _.each(
            _.keys(_.pick(map, _.compose(_.isEmpty, _.property('up')))),
            start
        );
        console.info('[info]', 'launcher started');
    });
};
