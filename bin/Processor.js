/**
 * 
 * @file Processor类 继承 events.EventEmitter
 * @author wujianwei01@baidu.com
 *
 */

var events = require('events');
var util = require('util');
var _ = require('underscore');

/**
 * Processor 类, 所有的processor都继承该类
 * Processor继承EventEmitter
 * 每个类都有三个方法，start、handler、finish
 * start接收数据流，若为根则是读取log日志
 * handler监听line事件
 * finish监听exit事件
 * @param {Object} options 包含start、handler和finish方法
 */
function Processor(options) {
    events.EventEmitter.apply(this, arguments);

    options = options || {};
    this.handler = options.handler || _.noop;
    this.finish = options.finish || _.noop;
    if (_.isFunction(options.start)) {
        this.start = options.start;
    }
}
Processor.prototype.start = _.noop;
util.inherits(Processor, events.EventEmitter);

module.exports = Processor;
