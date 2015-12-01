/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file Queue.js
 * @author Pride Leong<lykling.lyk@gmail.com>
 */
/* eslint-env node */

var events = require('events');
var util = require('util');
var _ = require('underscore');

/**
 * 隊列
 * @param {Object} options options of constructor
 *
 * @constructor
 */
function Queue(options) {
    var me = this;
    events.EventEmitter.apply(me, arguments);
    me.queue = [];
}
util.inherits(Queue, events.EventEmitter);

Queue.prototype.add = function (job) {
    this.queue.push(job);
    this.emit('added', {
        data: {
            target: job
        }
    });
};
Queue.prototype.remove = function (job) {
    var index = _.findIndex(this.queue, job);
    if (index >= 0) {
        this.queue.splice(index, 1);
        this.emit('removed', {
            data: {
                target: job
            }
        });
    }
};
Queue.prototype.shift = function () {
    return this.queue.shift();
};
Queue.prototype.getLength = function () {
    return this.queue.length;
};

module.exports = Queue;
