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
 * 抽取ajax成功信息
 */
function extractAjaxSuccData($object) {
    $req = json_decode($object['requestContent']);

    if ($req) {
        return array(
            'path' => $object['path'],
            'ajaxPath' => $req->path
        );
    }

    return null;
}

/**
 * 抽取ajax失败信息
 */
function extractAjaxFailData($object) {
    $req = json_decode($object['requestContent']);
    $resp = json_decode($object['responseContent']);

    if ($req && $resp) {
        return array(
            'path' => $object['path'],
            'ajaxPath' => $req->path,
            'status' => $object['status'],
            'httpStatus' => $object['httpStatus'],
            'desc' => $resp->desc
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

$jsonLogs = DQuery::input()
    ->select(extractLogData);

// 先计数成功的ajax
$succLogs = $jsonLogs
    ->filter(array('target', '==', 'ajaxInfo'))
    ->select(extractAjaxSuccData)
    ->group(array('path', 'ajaxPath'))
    ->countEach('*', 'succPv');

// 取失败的ajax
$rawFailLogs = $jsonLogs
    ->filter(array('target', '==', 'ajaxFail'))
    ->select(extractAjaxFailData);

// 分status计数失败的ajax
$byStatus = $rawFailLogs
    ->group(array('path', 'ajaxPath', 'status', 'httpStatus'))
    ->countEach('*', 'failPv');

// 只分path、ajaxPath计数失败的ajax
$byPath = $rawFailLogs
    ->group(array('path', 'ajaxPath'))
    ->countEach('*', 'totalFailPv');

/**
 * 统计ajax失败比率
 */
function statFailedAjax($object) {
    $totalPv = $object['succPv'] + $object['totalFailPv'];
    return array(
        'path' => $object['path'],
        'ajaxPath' => $object['ajaxPath'],
        'status' => $object['status'],
        'httpStatus' => $object['httpStatus'],
        'desc' => $object['desc'],
        'totalPv' => $totalPv,
        'failedPv' => $object['failPv'],
        'ratio' => $object['failPv'] / $totalPv
    );
}

// 组合两个计数
$failedLogs = $byStatus
        ->leftJoin($byPath, array('path', 'ajaxPath'))
        ->leftJoin($succLogs, array('path', 'ajaxPath'))
        ->select(statFailedAjax)
        ->sort(array('path', 'ratio'));

$failedLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_fail_daily',
    '凤巢前端AJAX失败日志_天',
    null,
    true
);

$failedLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_fail_json_daily',
    '凤巢前端AJAX失败日志_json_天',
    'toJsonOutput',
    true
);
