/**
 * @file 处理原始log中的一行，提取出其中的JSON。基于event-stream
 *       若当前行的JSON无法解析，向下游输出null。
 * @author hanbingfeng@baidu.com
 */
/* eslint-env node */

exports.step = function () {
    return require('event-stream').map(function (data, cb) {
        if (data == null) {
            cb(null, null);
            return;
        }
        var idMatch = /userid=(\d*)/.exec(data);
        var tokenMatch = /token="(.*?)"/.exec(data);
        // 匹配logData，找到logData=[ 中括号开始的位置
        var bracketStart = data.indexOf('logData=') + 8;
        // 匹配到中括号结束的位置
        var bracketDepth = 1;
        var index = bracketStart + 1;
        var isInQuotes = false;
        // 匹配状态常量
        var NORMAL = 0;
        var IN_QUOTES = 1;
        var AFTER_SLASH = 2;
        var IN_QUOTES_AFTER_SLASH = 3;
        var state = NORMAL;
        while (bracketDepth > 0 && index < data.length) {
            switch (data[index]) {
                case '"':
                    switch (state) {
                        case NORMAL:
                            state = IN_QUOTES;
                            break;
                        case AFTER_SLASH:
                            state = NORMAL;
                            break;
                        case IN_QUOTES:
                            state = NORMAL;
                            break;
                        case IN_QUOTES_AFTER_SLASH:
                            state = IN_QUOTES;
                            break;
                    }
                    break;
                case '\\':
                    switch (state) {
                        case NORMAL:
                            state = AFTER_SLASH;
                            break;
                        case AFTER_SLASH:
                            state = NORMAL; 
                            break;
                        case IN_QUOTES:
                            state = IN_QUOTES_AFTER_SLASH;
                            break;
                        case IN_QUOTES_AFTER_SLASH:
                            state = IN_QUOTES;
                            break;
                    }
                    break;
                case '[':
                    switch (state) {
                        case NORMAL:
                            bracketDepth++;
                            break;
                        case AFTER_SLASH:
                            state = NORMAL; 
                            break;
                        case IN_QUOTES:
                            break;
                        case IN_QUOTES_AFTER_SLASH:
                            state = IN_QUOTES;
                            break;
                    }
                    break;
                case ']':
                    switch (state) {
                        case NORMAL:
                            bracketDepth--;
                            break;
                        case AFTER_SLASH:
                            state = NORMAL; 
                            break;
                        case IN_QUOTES:
                            break;
                        case IN_QUOTES_AFTER_SLASH:
                            state = IN_QUOTES;
                            break;
                    }
                    break;
                default:
                    switch (state) {
                        case AFTER_SLASH:
                            state = NORMAL;
                            break;
                        case IN_QUOTES_AFTER_SLASH:
                            state = IN_QUOTES;
                            break;
                        default:
                            break;
                    }
                    break;
            }
            index++;
        }

        try {
            var ret = {};
            if (idMatch != null) {
                ret.userid = idMatch[1];
            }
            if (tokenMatch != null) {
                ret.token = tokenMatch[1];
            }
            ret.logData = JSON.parse(data.substring(bracketStart, index));
            cb(null, ret);
        }
        catch (ex) {
            console.error('parse json failed, ', ex, 'for line, ', data);
            cb(null, null);
        }
    });
};

