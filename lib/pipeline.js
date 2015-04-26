/**
 * @file 执行一个pipeline。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');
var q = require('q');

/**
 * 执行pipeline，根据定义json。
 * pipeline一定是一个array。执行规则为：
 * 1. 执行第一个step的step方法，返回的stream，pipe到下一个step的step方法。
 * 2. 第二个之后的step方法返回一个duplex stream。
 * 3. 第一个step返回的stream end后，本组pipeline end。
 * @param {object|Array} pipelineJson pipeline定义
 * @return {q#Promise} pipeline执行结果
 */
exports.execute = function (pipeline) {
    return q.Promise(function (resolve, reject, notify) {
        var previousStep = null;
        u.each(pipeline, function (step, index) {
            if (u.isArray(step)) {
                // 当前step是个array时，分开执行当前步骤和剩余的步骤。
                return exports.execute(step).then(function () {
                    return exports.execute(pipeline.slice(index + 1));
                });
            }

            var thisStep = require('./steps/' + step.step + '.js').step();
            thisStep.on('error', reject);
            if (index === 0) {
                // 第一个step end的时候，结束这组pipieline
                thisStep.on('end', resolve);
                // 并且没有previousStep可以pipe
            }
            else {
                previousStep.pipe(thisStep);
            }

            previousStep = thisStep; 
        });
    });   
};

