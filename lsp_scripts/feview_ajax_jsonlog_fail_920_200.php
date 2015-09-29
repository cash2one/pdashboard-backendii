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

function select920And200Data($object) {
    $req = json_decode($object['requestContent']);
    $resp = json_decode($object['responseContent']);
    if ($req && $resp) {
        return array(
            'timestamp' => $object['timestamp'],
            'reqId' => $req->reqId,
            'path' => $object['path'],
            'ajaxPath' => $req->path,
            'error' => $resp->error,
            'responseContent' => $object['responseContent'],
            'requestContent' => $object['requestContent']
        );
    }
    return null;
}

/**
 * 将数据转成JSON输出
 */
function toJsonOutput($nouse, $fields) {
    return json_encode($fields)."\n";
}

DQuery::input()
    ->select(extractLogData)
    ->filter(array(
        array('target', '==', 'ajaxFail'),
        array('status', '==', '920'),
        array('httpStatus', '==', '200')    
    ))
    ->select(select920And200Data)
    ->outputAsFile(
        'fengchao_feview_ajax_jsonlog_920_200_json_hourly',
        '凤巢前端AJAX失败日志_920和200_json_小时',
        'toJsonOutput',
        true
    );
