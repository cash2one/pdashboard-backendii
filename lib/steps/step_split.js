/**
 * @file 按照string或pattern分割上游数据。直接调用event-stream的split。
 * @author hanbingfeng@baidu.com
 */

exports.step = function (delim) {
    return require('event-stream').split(delim);
}

