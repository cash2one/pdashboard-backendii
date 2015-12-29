
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
 * 将数据转成JSON输出
 */
function toJsonOutput($nouse, $fields) {
    return json_encode($fields)."\n";
}

function filterLogs($logObjet) {
    // 过滤旧elementLogger发的点
    if ($logObject['logType'] === 'UBC') {
        return false;
    }

    return true;
}

$allLogs = DQuery::input()
    ->select(extractLogData)
    ->filter(array('target', '!=', null))
    ->filter(filterLogs)
    ->group(array('source', 'target'))
    ->countEach('*', 'count')
    ->select(array('source', 'target', 'count'))
    ->sort('count', 'desc');

$allLogs->outputAsFile(
    'fengchao_feview_pv_jsonlog_all',
    '凤巢全体埋点pv',
    null,
    true
);

$allLogs->outputAsFile(
    'fengchao_feview_pv_jsonlog_all_json',
    '凤巢全体埋点pv_JSON',
    'toJsonOutput',
    true
);
