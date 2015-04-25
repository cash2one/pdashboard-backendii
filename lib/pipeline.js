/**
 * @file 执行一个pipeline。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');
var q = require('q');

/**
 * 返回一个step function，接口同一般的step定义，接受reject，next的回调。
 * step内部顺序的调用arrayJson中所有的step。
 * @param {Array} arrayJson steps数组 
 * @param {Function} reject reject方法 
 * @return {Function} step方法
 */
function makeArrayStep(arrayJson) {
    // array中所有step的step function
    var steps = [];
    // 标记所有step都已end的deferreds
    var deferreds = [];
    // 串一串steps
    u.each(arrayJson, function (aStep, index) {
        var func = u.isArray(aStep) ? makeArrayStep(aStep) : makeSingleStep(aStep);
        // 当前step的end deferred标记
        var deferred = q.defer();
        deferreds[index] = deferred.promise;
        // 当前step的next方法实现
        func._callNext = function (data) {
            if (index + 1 === steps.length) {
                // 没有下一个了
                return;
            }
            // 调下一个step方法的step
            var nextStep = steps[index + 1];
            nextStep.apply(null, [reject, nextStep._callNext].concat(Array.prototype.slice.call(arguments));
            if (data === null) {
                // 传入一个null作为data表示当前step结束
                deferred.resolve();
            }
        };

        func._reject = function (ex) {
            deferred.reject(ex);
        };

        steps.push(func);
    });

    return function (reject, next) {
        steps[0].step(steps[0]._reject, steps[0]._callNext);
        // 直到所有的deferreds都resolve后才下一步
        q.all(deferreds).done(function (results) {
            next(results);
        }, function (ex) {
            reject(ex);
        });
    };
} 

/**
 * 根据单步step定义返回一个step方法。
 * @param {object} stepJson
 * @return {Function} step方法
 */
function makeSingleStep(stepJson) {
    return require('./steps/' + pipelineJson.step + '.js').step.apply(null, thisStep.arguments);
}

/**
 * 执行pipeline，根据定义json。
 * @param {object|Array} pipelineJson pipeline定义
 * @return {q#Promise} pipeline执行结果
 */
exports.execute = function (pipelineJson) {
    return new q.Promise(
        function (resolve, reject, notify) {
            u.isArray(pipelineJson)
                ? makeArrayStep(pipelineJson)(reject, resolve);
                : makeSingleStep(pipelineJson)(reject, resolve);
        }
    ); 
};

