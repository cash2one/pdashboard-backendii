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

$aoFailLogs = DQuery::input()
    ->select(extractLogData)
    ->filter('target', '==', 'rendered_aomanual_fail');

$aoFailLogs
    ->select(array('errorInfo'))
    ->outputAsFile(
        'feview_ao_error_logs',
        '新AO错误信息',
        null,
        true
    );

$aoFailLogs
    ->filter(array(
        array('pageStabled', '!=', '1'),
        array('iframeShowed', '==', null)
    ))
    ->outputAsFile(
        'feview_ao_error_logs_is_first',
        '新AO错误信息_仅首屏'
    );
