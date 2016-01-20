/**
 * @file 获取推广实况的分设备pv
 */

/**
 * 输出$object的调试信息。直接返回$object使得该函数可以直接作为select()的参数。
 */
function debugPrint($object) {
    fprintf(STDERR, print_r($object, true));
    return $object;
}

/**
 * 调试信息输出
 */
function debugTrace($fields){
    \Utils::trace($fields);
    return $fields;
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

$jsonLogs = DQuery::input()
    ->select(extractLogData);

$respLog = $jsonLogs
    ->filter(array(
        array('source', '==', 'nirvana_app_liveViewer'),
        array('target', '==', 'check_all_state'),
        array('result', '!=', 'frame_load'),
        array('result', '!=', 'frame_loaded')
    ))
    ->uniq('reqid');


/*
 * 计算总的请求数
 */
$totalRespCount = $respLog
    ->count('*', 'total_resp_count')
    ->select(array('total_resp_count'));
/*
 * 计算pc的超时请求数
 */
$respPcTimeoutPvCount = $respLog
    ->filter(array(
        array('result', '==', 'timeout_result'),
        array('framekey', '==', 'pc')
    ))
    ->count('*', 'pc_timeout_resp_count')
    ->select(array('pc_timeout_resp_count'));

/*
 * 计算phone的超时请求数
 */
$respPhoneTimeoutPvCount = $respLog
    ->filter(array(
        array('result', '==', 'timeout_result'),
        array('framekey', '==', 'phone')
    ))
    ->count('*', 'phone_timeout_resp_count')
    ->select(array('phone_timeout_resp_count'));

/*
 * 计算discard的请求数
 */
$respDiscardPvCount = $respLog
    ->filter(array(
        array('result', '==', 'discard_result'),
        array('framekey', '==', 'phone')
    ))
    ->count('*', 'discard_resp_count')
    ->select(array('discard_resp_count'));

$resultArr = array(
    'totalCount'=>$totalRespCount,
    'pcTimeoutCount'=>$respPcTimeoutPvCount,
    'phoneTimeoutCount'=>$respPhoneTimeoutPvCount,
    'discardRespCount'=>$respDiscardPvCount
);

$resultArr->outputAsFile(
    'fengchao_feview_adpreview_timeout_resp_json',
    '推广实况超时请求统计',
    'toJsonOutput',
    true
);