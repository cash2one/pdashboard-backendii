/**
* @file 工具文件
* @author Gu Shouchuang (gushouchuang@baidu.com)
* @author wujianwei01@baidu.com
*/


/**
* 将数据保存为number位小数
* @param {string|number} data 要处理的数据
* @param {number} number 最多保留number位
* @return {number} number 保留number位的数据
*/
exports.fixed2Data = function (data, number) {
    var number = number || 0;
    var fixdata = (data + '').split('.');
    if (fixdata.length < 2 || fixdata[1].length <= number) {
        return +data;
    }
    return +(fixdata[0] + '.' + fixdata[1].substring(0, number));
};

/**
 * 若月，日，小时、分钟 小于10,在前面加一个0
 * 若传的参数为number 转为string
 * @param {string|number} time 传入的时间值
 * @return {string} time 字符串
 */
exports.addZeroWhileLessThanTen = function (time) {
    if (time < 10) {
        time = '0' + time;
    }
    return '' + time;
};
