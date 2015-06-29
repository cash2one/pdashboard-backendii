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
    // 当前pipeline第一个array开始的新pipeline的promise
    var leftPromise = null;
    return q.Promise(function (resolve, reject, notify) {
        try {
            var previousStep = null;
            u.find(pipeline, function (step, index) {
                if (u.isArray(step)) {
                    // 当前step是个array时，分开执行当前步骤和剩余的步骤。
                    leftPromise = exports.execute(step).then(function () {
                        return exports.execute(pipeline.slice(index + 1));
                    }, reject);
                    // 跳出find
                    if (index === 0) {
                        // 第一个就是array，当前pipeline无事可做，直接resolve。
                        resolve();
                    }
                    return true;
                }
                
                var thisStep = require('./steps/' + step.step + '.js')
                    .step
                    .apply(null, step.arguments ? step.arguments : []);

                thisStep.on('error', function (err) {
                    console.error('error in step', step.step, err, err.stack);
                    reject(err);
                });

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
        }
        catch (ex) {
            reject(ex);
        }
    }).then(function () {
        // 当前的完事后，等着leftPromise，如果有的话
        if (leftPromise != null) {
            return leftPromise;
        }

        return q();
    });
};

