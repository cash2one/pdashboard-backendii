/**
* file 工具文件
*autor Gu Shouchuang (gushouchuang@baidu.com)
*/


/**
*param data {String or Number} 要处理的数据 
*param number {Number} 最多保留number位
*/
exports.fixed2Data = function (data, number) {
    var number = number || 0;
    var fixdata = (data + '').split('.');
    if (fixdata.length < 2 || fixdata[1].length <= number) {
        return +data;
    }
    return +(fixdata[0] + '.' + fixdata[1].substring(0, number));
}