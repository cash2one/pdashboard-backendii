/**
 * @file 一个全局的context注册器，供一个pipeline session使用。
 * @author Han Bing Feng
 */

var context = {};

/**
 * 获得一个值。
 * @param {string} key 一个键的名字。
 * @return {*} 对应的值
 */
exports.get = function (key) {
    return context[key];
}

/**
 * 存入一个键值对。
 * @param {string} key 一个键的名字。
 * @param {*} 对应的值
 */
exports.set = function (key, value) {
    return context[key] = value;
}

exports.dump = function () {
    console.log(context);
};
