
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

$krSearchLogs = DQuery::input()
    ->select(extractLogData)
    ->filter(array(
        array('target', '==', 'krstation_search_time'),
        array('source', '==', 'module_app_krStation')
    ));

$krSearchPv = $krSearchLogs
    ->count('*', 'pv')
    ->select(array('pv'));

$krSearchPv
    ->select(array('pv'))
    ->outputAsNumeric('fengchao_feview_pv_jsonlog_kr_search_num', 'KR搜索添加PV');

/**
 * 将数据转成JSON输出
 */
function toJsonOutput($nouse, $fields) {
    return json_encode($fields)."\n";
}

// 按path分析pv分布
$krSearchPv
    ->outputAsFile(
        'fengchao_feview_pv_jsonlog_kr_search_json',
        'KR搜索添加PV_JSON',
        'toJsonOutput',
        true
    );

