/**
 * @file 获取前端统计中多于后端的uv在kr中的其它操作日志
 */


function myDebug($fields){
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

// 请求logs
$reqLog = $jsonLogs
    ->filter(array(
        array('source', '==', 'module_app_krStation'),
        array('userid', 'match', '/10956330|10990871/')
    ))
    ->group('userid')
    ->sortEach('timestamp', 'asc');
//    ->select("myDebug");

$reqLog->outputAsFile(
    'fengchao_feview_exceed_fe_kr_uv_json',
    '凤巢关键词推荐前端多出uv行为统计',
    'toJsonOutput',
    true
);