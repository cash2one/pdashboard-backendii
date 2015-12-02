/**
 * @file 获取推广实况"非法结果"的结果详情
 */

/**
 * 输出$object的调试信息。直接返回$object使得该函数可以直接作为select()的参数。
 */
function debugPrint($object) {
    fprintf(STDERR, print_r($object, true));
    return $object;
}

/**
 * decode JSON数据行，返回array，含有一条日志信息。
 */
function extractLogData($object) {
    $logObject = json_decode($object['_Line']);
    $msgObject = $logObject->msg;
    $paramObject = $msgObject->param;
    $result = array();
    $result['_Line'] = $object['_Line'];
    if (gettype($paramObject) == "object") {
        foreach($paramObject as $k => $v) {
            if(gettype($v) == "string") {
                $result[$k] = $v;
            }
            else if (gettype($v) == "array" || gettype($v) == "object") {
                $result[$k] = json_encode($v);
            }
            else
            {
                $result[$k] = $v;
            }
        }
    }
    return $result;
}

/**
 * decode JSON数据行，返回array，含有一条日志信息。
 */
function extractInvalidResult($object) {
    $logObject = $object['_Line'];
    $result = array();
    $start = strpos($logObject, '"invalidResult":[');
    $end = strpos($logObject, '"],', $start);
    $invalidResult = substr($logObject, $start, $end - $start);
    $result['result'] = $invalidResult;
    // 把数字找出来
    $start = strpos($invalidResult, '[');
    $end = strpos($invalidResult, ',', $start);
    $result['length'] = intval(substr($invalidResult, $start, $end - $start));
    return $result;
}

DQuery::input()
->select(extractLogData)
->filter(array(
    array('target', '==', 'check_all_state'),
    array('result', '==', 'invalid_preview_result')
))
->select(extractInvalidResult)
->sort('length', 'asc')
->outputAsFile(
    'fengchao_feview_biz_jsonlog_adpreview_invalid_result',
    '推广实况非法返回分析',
    null,
    true
);
