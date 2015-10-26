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
    private $mCount;

    public function init() {
        $this->totalCount = 0;
        $this->pcCount = 0;
        $this->mCount = 0;
    }

    public function process($fields) {
        switch ($fields['device']) {
            case 0:
            case '0':
                $this->totalCount = $fields['count'];
                break;
            case 1:
            case '1':
                $this->pcCount = $fields['count'];
                break;
            case 2:
            case '2':
                $this->mCount = $fields[‘count’];
                break;
            default:
                break;
        }
    }

    public function fini() {
        return array(
            'target' => 'adpreview',
            'reqTotalCount' => $this->totalCount * 2 + $this->pcCount + $this->mCount,
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
    private $invalidRespCount;

    public function init() {
        $this->validCount = 0;
        $this->banCount = 0;
        $this->invalidUserCount = 0;
        $this->invalidRespCount = 0;
    }

    public function process($fields) {
        switch ($fields['target']) {
            case 'valid_preview_result':
                $this->validCount = $fields['count'];
                break;
            case 'ban_preview_result':
                $this->banCount = $fields['count'];
                break;
            case 'invalid_preview_user':
                $this->invalidUserCount = $fields[‘count’];
                break;
            case 'invalid_preview_result':
                $this->invalidRespCount = $fields[‘count’];
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
            'respInvalidRespCount' => $this->invalidRespCount
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

$respLog = $jsonLogs
    ->filter(array(
        array('source', '==', 'nirvana_app_liveViewer'),
        array('target', 'in', array(
            'valid_preview_result' => 1,
            'ban_preview_result' => 1,
            'invalid_preview_user' => 1,
            'invalid_preview_result' => 1
        ))
    ))
    ->group('target');

$respPvLog = $respLog
    ->countEach('*', 'count')
    ->select(array('target', 'count'))
    ->process(StatRespProcessor);

$respUvLog = $respLog
    ->uniqCountEach('userid', 'count')
    ->select(array('target', 'count'))
    ->process(StatRespProcessor);

$resultPv = $reqPvLog
    ->leftJoin($respPvLog, 'adpreview')
    ->select(array(
        'reqTotalCount', 'reqPcCount', 'reqMobileCount',
        'respValidCount', 'respBanCount', 'respInvalidUserCount', 'respInvalidRespCount'
    ));

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

/**
 * 计算实况的稳定比
 */
function computeSuccRatio($fields) {
    return array(
        'ratio' => $fields['respValidCount'] / (
            $fields['respValidCount']
            + $fields['respBanCount']
            + $fields['respInvalidUserCount']
            + $fields['respInvalidRespCount']
        )
    );
}

$resultPv->select(computeSuccRatio)
    ->outputAsNumeric(
        'fengchao_feview_succ_ratio_jsonlog_adpreview',
        '凤巢前端实况正常返回比'
    );

$resultUv = $reqUvLog
    ->leftJoin($respUvLog, 'adpreview')
    ->select(array(
        'reqTotalCount', 'reqPcCount', 'reqMobileCount',
        'respValidCount', 'respBanCount', 'respInvalidUserCount', 'respInvalidRespCount'
    ));

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

$resultUv->select(computeSuccRatio)
    ->outputAsNumeric(
        'fengchao_feview_succ_ratio_uv_jsonlog_adpreview',
        '凤巢前端实况正常返回比_UV'
    );
