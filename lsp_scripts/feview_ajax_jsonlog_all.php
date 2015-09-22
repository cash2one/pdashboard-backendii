/**
 * 输出$object的调试信息。直接返回$object使得该函数可以直接作为select()的参数。
 */
function debugPrint($object) {
    fprintf(STDERR, print_r($object, true));
    return $object;
}

/**
 * 统计processor，上游送来group过的，排序过的性能指标。在这里计算分位值、pv和平均值。
 */
class StatProcessor implements \IUserProcessor {
    private $values;
    private $sum;
    // 因大于100s而过滤的pv
    private $gte100Count;

    public function init() {
        $this->values = array();
        $this->sum = 0;
        $this->gte100Count = 0;
    }

    public function process($fields) {
        $v = $fields['value'];
        if ($v < 0) {
            // 负数什么鬼
            return;
        }
        
        if ($v > 100000) {
            // 大于100s的滤掉
            $this->gte100Count++;
            return;
        }

        $this->values[] = $v;
        $this->sum += $v;
    }

    public function fini() {
        $count = count($this->values);
        return array(
            'pv' => $count,
            'average' => $this->sum / $count,
            't95' => $this->values[floor($count * 0.95)],
            't80' => $this->values[floor($count * 0.80)],
            't50' => $this->values[floor($count * 0.50)],
            'gte100' => $this->gte100Count
        );
    }
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
 * 过滤ajax path
 */
function filterAjaxPath($object) {
    $req = json_decode($object['requestContent']);
    return in_array($req->path, array(
        'vega/GET/basicInfo',
        'vega/GET/material',
        'vega/GET/mtl/planlist',
        'vega/GET/mtl/wordlist',
        'fusion/GET/adplanlist',
        'fusion/GET/adwordlist',
        'vega/GET/accounttree/childrennodes',
        'jupiter/GET/nikon/saturnAoAbstract',
        'nirvana/GET/ao/request'
    ));
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
            'desc' => $resp->desc,
            'value' => floatval($object['spent'])
        );
    }

    return null;
}

/**
 * 抽取ajax成功信息
 */
function extractAjaxSuccData($object) {
    $req = json_decode($object['requestContent']);

    if ($req) {
        return array(
            'path' => $object['path'],
            'ajaxPath' => $req->path,
            'value' => floatval($object['spent'])
        );
    }

    return null;
}

/**
 * 统计ajax失败比率
 */
function statFailedAjax($object) {
    $totalPv = $object['pv'] + $object['failedTotal'];
    return array(
        'path' => $object['path'],
        'ajaxPath' => $object['ajaxPath'],
        'status' => $object['status'],
        'httpStatus' => $object['httpStatus'],
        'desc' => $object['desc'],
        'totalPv' => $totalPv,
        'failedPv' => $object['failedPv'],
        'ratio' => $object['failedPv'] / $totalPv
    );
}

/**
 * 将数据转成JSON输出
 */
function toJsonOutput($nouse, $fields) {
    return json_encode($fields)."\n";
}

$jsonLogs = DQuery::input()
    ->select(extractLogData);

$planJsonLogs = $jsonLogs
    ->filter(array('path', '==', '/manage/plan'));

$keywordJsonLogs = $jsonLogs
    ->filter(array('path', '==', '/manage/keyword'));

/**
 * 分析ajax成功日志
 */
function processAjaxSuccLogs($DQ) {
    return $DQ
        ->filter(array('target', '==', 'ajaxInfo'))
        ->filter(filterAjaxPath)
        ->select(extractAjaxSuccData)
        ->group(array('ajaxPath'))->each(
            DQuery::sort('value', 'asc')->process(StatProcessor)
        )->select(array(
            'ajaxPath', 'pv', 'average', 't50', 't80', 't95', 'gte100'
        ))->sort(array('pv'));
}

// 1, ajaxInfo中抽取ajax成功信息
$planSuccLogs = processAjaxSuccLogs($planJsonLogs);
$planSuccLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_plan_succ',
    '凤巢前端AJAX成功日志_计划',
    null,
    true
);
$planSuccLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_plan_succ_json',
    '凤巢前端AJAX成功日志_计划_JSON',
    'toJsonOutput',
    true
);

$kwSuccLogs = processAjaxSuccLogs($keywordJsonLogs);
$kwSuccLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_keyword_succ',
    '凤巢前端AJAX成功日志_关键词',
    null,
    true
);
$kwSuccLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_keyword_succ_json',
    '凤巢前端AJAX成功日志_关键词_JSON',
    'toJsonOutput',
    true
);

// 2. ajaxFail中抽取ajax失败信息
$ajaxFailLogs = $jsonLogs
    ->filter(array('target', '==', 'ajaxFail'));
$planFailLogs = $ajaxFailLogs
    ->filter(array('path', '==', '/manage/plan'));
$keywordFailLogs = $ajaxFailLogs
    ->filter(array('path', '==', '/manage/keyword'));

function processAjaxFailLogs($succDQ, $failDQ) {
    $failLogs = $failDQ
        ->select(extractAjaxFailData)
        ->filter(filterAjaxPath)
        ->group(array(
            'ajaxPath', 'status', 'httpStatus'
        ))->countEach('*', 'failedPv');

    // 算出失败的总pv
    $failPv = $failLogs
        ->group(array('ajaxPath'))
        ->sumEach('failedPv', 'failedTotal');

    // join 失败的总pv
    $failLogs = $failLogs
        ->leftJoin($failPv, array('ajaxPath'));

    // join ajax succ 日志，分析失败占比
    return $failLogs
        ->leftJoin($succDQ, array('ajaxPath'))
        ->select(statFailedAjax)
        ->uniq(array(
            'ajaxPath', 'status', 'httpStatus'
        ))
        ->sort(array('ratio'));
}

$processedPlanAjaxFailLogs = processAjaxFailLogs($planSuccLogs, $planFailLogs);
$processedPlanAjaxFailLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_plan_fail',
    '凤巢前端AJAX失败日志_计划',
    null,
    true
);
$processedPlanAjaxFailLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_plan_fail_json',
    '凤巢前端AJAX失败日志_json_计划',
    'toJsonOutput',
    true
);

$processedKwAjaxFailLogs = processAjaxFailLogs($kwSuccLogs, $keywordFailLogs);
$processedKwAjaxFailLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_kw_fail',
    '凤巢前端AJAX失败日志_关键词',
    null,
    true
);
$processedKwAjaxFailLogs->outputAsFile(
    'fengchao_feview_ajax_jsonlog_kw_fail_json',
    '凤巢前端AJAX失败日志_json_关键词',
    'toJsonOutput',
    true
);

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

// 3, 从失败日志里整理输出同时有status 920和httpStatus 200 fail的ajax
$ajaxFailLogs
    ->filter(array(
        array('status', '==', '920'),
        array('httpStatus', '==', '200')
    ))
    ->select(select920And200Data)
    ->outputAsFile(
        'fengchao_feview_ajax_jsonlog_status_920_httpStatus_200_json_hourly',
        '凤巢前端AJAX失败日志_920和200_json_小时',
        'toJsonOutput',
        true
    );
