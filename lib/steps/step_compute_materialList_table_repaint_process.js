
/**
 * @file 计算物料列表表格刷新时间。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

exports.step = function () {
    var INDEX_BY_EXPR = require('../context').get('INDEX_BY_EXPR');
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }

        u.each(data, function (entries) {
            entries[INDEX_BY_EXPR[
                'performance_materialList_table_repaint_process'
            ]] = entries[INDEX_BY_EXPR[
                'performance_materialList_table_repaint.performance_materialList_table_repaint_finish_1'
            ]] - entries[INDEX_BY_EXPR[
                'performance_materialList_table_repaint.performance_materialList_table_repaint_start_0'
            ]];
        });

        cb(null, data);
    }); 
};

