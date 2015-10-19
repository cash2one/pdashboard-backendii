/**
 *
 * @file 根据传入的index和map参数，注册事件，并启动流程
 * @author wujianwei01@baidu.com
 */
var _ = require('underscore');
var Processor = require('./Processor');
/**
 * 找出map对象中的第一个key,
 * 作为开始流的第一个对象
 * @param {Object} map 传入的map参数
 * @return {string} i map的第一个key
 */
function findFirstKeyInMap(map) {
    for (var i in map) {
        return i;
    }
}


/**
 * 处理下载完成的日志
 * 
 * @param {Object} index 存放详细处理流程
 * @param {string} url mongodb地址
 * @param {Object} map 流程的详细结构
 */
function processLog (opts, db, map) {
    return new Promise(function (resolve, reject) {
        var index = require('./processor_basic_plan').basicPlanIndex(opts, db);
        var done = new Processor({
            start: _.noop,
            handler: _.noop,
            finish: function(evt) {
                resolve();
            }
        });
        index['done'] = done;
        /**
         * 利用后序遍历的思路处理map中的流程
         * 先将所有叶子注册事件
         * 最后运行根节点的start
         * @param {string} current
         */
        function start (current) {
            var inst = index[current];
            _.each(map[current].down, function (down) {
                start(down);
            });
            _.each(map[current].up, function (up) {
                var upInst = index[up];
                upInst.on('line', _.bind(inst.handler, inst));
                upInst.on('end', _.bind(inst.finish, inst));
            });
            inst.start();
        }
        start(findFirstKeyInMap(map));
    });
}

module.exports = processLog;
