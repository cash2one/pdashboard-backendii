/**
 * @file 提取log session id和log
 * @author hanbingfeng
 */

var u = require('underscore');

exports.step = function () {
    var targetPath = require('../context').get('targetPath');

    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }

        cb(null, u.chain(data.logData)
            .filter(function (item) {
                if (targetPath != null) {
                    return item.path.indexOf(targetPath) >= 0;
                }
                else {
                    return true;
                }
            })
            .groupBy('logSessionId')
            .value()
          );
    });
};

