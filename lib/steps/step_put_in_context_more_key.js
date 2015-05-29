/**
* @file 通过第三个字段 区分新旧版本的keyword页面统计 set到context中
* @author gushouchuang@baidu.com
*/
var performance_name = ['performance_mod_bid', 'performance_mod_wurl', 'performance_mod_mwurl', 'performance_mod_wmatch', 'performance_mod_bid_inline', 'performance_mod_wurl_inline', 'performance_mod_mwurl_inline', 'performance_mod_wmatch_inline'];

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        
        if (data == null) {
            cb(null, null);
        }
        else {
            var context = require('../context');
            var ret = context.get('results');
            
            if (ret == null) {
                ret = {
                    'new': {},
                    'old': {}
                };
                for (var iname = 0; iname < performance_name.length; iname++) {
                    for (var key in ret) {
                        ret[key][performance_name[iname]]  = [];
                    }
                }
                context.set('results', ret);
            }
            var cdata = (data + '').split(/\t/);
            //0 -- performanceName  1 -- value  2 -- version new or old
            if (cdata.length === 3) {
                ret[cdata[2]][cdata[0]].push(cdata[1]);
            }
            cb(null, data);
        }
    });
}

