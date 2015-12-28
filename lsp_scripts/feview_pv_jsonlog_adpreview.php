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

/**
 * 从实况请求中整理分设备的总请求数
 */
class StatReqProcessor implements \IUserProcessor {
    private $totalCount;
    private $pcCount;
    private $mobileCount;

    public function init() {
        $this->totalCount = 0;
        $this->pcCount = 0;
        $this->mobileCount = 0;
    }

    public function process($fields) {
        switch ($fields['device']) {
            // device有可能是额外的值，为避免出错都用了+=
            case 0:
            case '0':
                $this->totalCount += $fields['count'];
                break;
            case 1:
            case '1':
                $this->pcCount += $fields['count'];
                break;
            case 2:
            case '2':
                $this->mobileCount += $fields['count'];
                break;
            default:
                break;
        }
    }

    public function fini() {
        return array(
            'target' => 'adpreview',
            'reqOnlyTotal' => $this->totalCount,
            'reqOnlyPc' => $this->pcCount,
            'reqOnlyMobile' => $this->mobileCount,
            'reqTotalCount' => $this->totalCount * 2 + $this->pcCount + $this->mobileCount,
            'reqPcCount' => $this->totalCount + $this->pcCount,
            'reqMobileCount' => $this->totalCount + $this->mobileCount
        );
    }
}

/**
 * 从实况请求中整理分设备的总请求数
 */
class StatRespProcessor implements \IUserProcessor {
    private $validCount;
    private $banCount;
    private $invalidUserCount;
    private $serverExceptionCount;
    private $timeoutCount;
    private $noAdsCount;
    private $invalidRespCount;
    private $frameLoad;
    private $frameLoaded;

    public function init() {
        $this->validCount = 0;
        $this->banCount = 0;
        $this->invalidUserCount = 0;
        $this->noAdsCount = 0;
        $this->serverExceptionCount = 0;
        $this->timeoutCount = 0;
        $this->invalidRespCount = 0;
        $this->frameLoad = 0;
        $this->frameLoaded = 0;
    }

    public function process($fields) {
        switch ($fields['result']) {
            case 'valid_preview_result':
                $this->validCount = $fields['resultSum'];
                break;
            case 'ban_preview_result':
                $this->banCount = $fields['resultSum'];
                break;
            case 'invalid_preview_user_result':
                $this->invalidUserCount = $fields['resultSum'];
                break;
            case 'no_ads_result':
                $this->noAdsCount = $fields['resultSum'];
                break;
            case 'server_exception_result':
                $this->serverExceptionCount = $fields['resultSum'];
                break;
            case 'timeout_result':
                $this->timeoutCount = $fields['resultSum'];
                break;
            // 这个分类在12月10日上线之后将不再有
            case 'invalid_preview_result':
                $this->invalidRespCount = $fields['resultSum'];
                break;
            // 2015.12月24日新上线
            case 'frame_load':
                $this->frameLoad = $fields['resultSum'];
                break;
            case 'frame_loaded':
                $this->frameLoaded = $fields['resultSum'];
                break;            
            default:
                break;
        }
    }

    public function fini() {
        return array(
            'target' => 'adpreview',
            'respValidCount' => $this->validCount,
            'respBanCount' => $this->banCount,
            'respInvalidUserCount' => $this->invalidUserCount,
            'respNoAdsCount' => $this->noAdsCount,
            'respServerExceptionCount' => $this->serverExceptionCount,
            'respInvalidRespCount' => $this->invalidRespCount,
            'respTimeoutCount' => $this->timeoutCount,
            'respFrameLoad' => $this->frameLoad,
            'respFrameLoaded' => $this->frameLoaded
        );
    }
}

$jsonLogs = DQuery::input()
    ->select(extractLogData);
 
// 请求logs
$reqLog = $jsonLogs
    ->filter(array('target', '==', 'searchAdPreview'))
    ->group('device');

$reqPvLog = $reqLog
    ->countEach('*', 'count')
    ->select(array('target', 'device', 'count'))
    ->process(StatReqProcessor);

$reqUvLog = $reqLog
    ->uniqCountEach('userid', 'count')
    ->select(array('target', 'device', 'count'))
    ->process(StatReqProcessor);

$reqPvLog->outputAsFile(
    'fengchao_feview_pv_jsonlog_adpreview_request',
    '凤巢前端实况请求PV_天',
    null,
    true
);

$reqUvLog->outputAsFile(
    'fengchao_feview_uv_jsonlog_adpreview_request',
    '凤巢前端实况请求UV_天',
    null,
    true
);

$reqPvLog->outputAsFile(
    'fengchao_feview_pv_jsonlog_adpreview_request_json',
    '凤巢前端实况请求PV_天_json',
    'toJsonOutput',
    true
);

$reqUvLog->outputAsFile(
    'fengchao_feview_uv_jsonlog_adpreview_request_json',
    '凤巢前端实况请求UV_天_json',
    'toJsonOutput',
    true
);

$respLog = $jsonLogs
    ->filter(array(
        array('source', '==', 'nirvana_app_liveViewer'),
        array('target', '==', 'check_all_state'),
        array('result', '!=', 'frame_load'),
        array('result', '!=', 'frame_loaded')
    ))
    ->uniq('reqid')
    ->union(
        $jsonLogs->filter(array(
            array('source', '==', 'nirvana_app_liveViewer'),
            array('target', '==', 'check_all_state'),
            array('result', '==', 'frame_load')
        ))
        ->uniq('reqid')
    )
    ->union(
        $jsonLogs->filter(array(
            array('source', '==', 'nirvana_app_liveViewer'),
            array('target', '==', 'check_all_state'),
            array('result', '==', 'frame_loaded')
        ))
        ->uniq('reqid')
    )
    ->group(array('device', 'framekey', 'result'));

$respPvLog = $respLog
    ->countEach('*', 'count')
    ->select(array('device', 'framekey', 'result', 'count'));

$respUvLog = $respLog
    ->uniqCountEach('userid', 'count')
    ->select(array('device', 'framekey', 'result', 'count'));

$respPvLog->outputAsFile(
    'fengchao_feview_pv_jsonlog_adpreview_response',
    '凤巢前端实况响应PV_天',
    null,
    true
);

$respUvLog->outputAsFile(
    'fengchao_feview_uv_jsonlog_adpreview_response',
    '凤巢前端实况响应UV_天',
    null,
    true
);

$respPvLog->outputAsFile(
    'fengchao_feview_pv_jsonlog_adpreview_response_json',
    '凤巢前端实况响应PV_天_json',
    'toJsonOutput',
    true
);

$respUvLog->outputAsFile(
    'fengchao_feview_uv_jsonlog_adpreview_response_json',
    '凤巢前端实况响应UV_天_json',
    'toJsonOutput',
    true
);

/**
 * 计算分result的sum
 */
function computeResultSum($DQ) {
    return $DQ
        ->group('result')
        ->sumEach('count', 'resultSum')
        ->select(array(
            'result', 'resultSum'
        ))
        ->process(StatRespProcessor);    
}

$respPvLog = computeResultSum($respPvLog);
$respUvLog = computeResultSum($respUvLog);

/**
 * 组合resp和req，生成结果集
 */
function computeResult($reqDQ, $respDQ) {
    return $reqDQ
        ->leftJoin($respDQ, 'adpreview')
        ->select(array(
            'reqTotalCount', 'reqPcCount', 'reqMobileCount',
            'reqOnlyTotal', 'reqOnlyPc', 'reqOnlyMobile',
            'respValidCount',
            'respBanCount',
            'respInvalidUserCount',
            'respNoAdsCount',
            'respServerExceptionCount',
            'respInvalidRespCount',
            'respTimeoutCount',
            'respFrameLoad',
            'respFrameLoaded'
        ));
}

$resultPv = computeResult($reqPvLog, $respPvLog);
$resultUv = computeResult($reqUvLog, $respUvLog);

$resultPv->outputAsFile(
    'fengchao_feview_pv_jsonlog_adpreview',
    '凤巢前端实况PV_天',
    null,
    true
);

$resultPv->outputAsFile(
    'fengchao_feview_pv_jsonlog_adpreview_json',
    '凤巢前端实况PV_json_天',
    'toJsonOutput',
    true
);

$resultUv->outputAsFile(
    'fengchao_feview_uv_jsonlog_adpreview',
    '凤巢前端实况UV_天',
    null,
    true
);

$resultUv->outputAsFile(
    'fengchao_feview_uv_jsonlog_adpreview_json',
    '凤巢前端实况UV_json_天',
    'toJsonOutput',
    true
);


/**
 * 计算实况的稳定比
 */
function computeSuccRatio($fields) {
    return array(
        'ratio' => $fields['respValidCount'] / (
            $fields['respValidCount']
            + $fields['respBanCount']
            + $fields['respInvalidUserCount']
            + $fields['respNoAdsCount']
            + $fields['respServerExceptionCount']
            + $fields['respInvalidRespCount']
            + $fields['respTimeoutCount']
        )
    );
}

$resultPv->select(computeSuccRatio)
    ->outputAsNumeric(
        'fengchao_feview_succ_ratio_jsonlog_adpreview',
        '凤巢前端实况正常返回比'
    );

$resultUv->select(computeSuccRatio)
    ->outputAsNumeric(
        'fengchao_feview_succ_ratio_uv_jsonlog_adpreview',
        '凤巢前端实况正常返回比_UV'
    );