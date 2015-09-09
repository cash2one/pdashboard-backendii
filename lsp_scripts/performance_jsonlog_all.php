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
 * 日志用户行为过滤
 */
function filterEventsBeforeDumped($logObject) {
    return is_null($logObject['__hasEvents'])
        || $logObject['__hasEvents'] != 1;
}

/**
 * pageInactived过滤
 */
function filterPageInactived($logObject) {
    $v = $logObject['pageInactived'];
    return is_null($v) || $v == 0;
}

/**
 * 判断是否给定的log key符合$item的描述。
 */
function keyMatches($key, $item) {
    if (substr($item, -1) == '*') {
        // 以'*'结尾，判断是否$key以$item（去掉*以后）开头
        return strpos($key, substr($item, 0, -1)) === 0;
    }

    return $key == $item;
}

/**
 * 选取要统计的性能日志项，输出一个结果集，每一条有4个属性
 *     - value: 该项性能值
 *     - item: 该项性能名称
 *     - target: 该项所属target名字
 *     - path: 该项log所在的path
 * 目前支持性能项的表示:
 *     - 末尾*：只匹配属性的开头
 */
function selectItems($logObject) {
    $ITEMS = array(
        // 基础性能
        'performance_static',
        'performance_materialList',
        'performance_accountTree',
        'performance_ao_manual',
        // timeline
        'performance_static_js_sync_loaded',
        'performance_static_js_async_loaded',
        'performance_static_basicInfo_start',
        'performance_static_basicInfo_finish',
        'performance_manage_actionloaded',
        'performance_manage_enteraction',
        'performance_manage_enter',
        'performance_manage_beforemodelload',
        'performance_manage_load_navinfo',
        'performance_manage_load_materiallist',
        'performance_manage_account_tree_start',
        'performance_manage_account_tree_inited',
        'performance_manage_ao_manual_start',
        'performance_manage_ao_manual_nirvana_base_loaded',
        'performance_manage_ao_manual_js_async_loaded',
        'performance_manage_ao_manual_control_started',
        'performance_manage_ao_manual_finished',
        // 新AO相关
        'performance_newAomanual',
        'performance_newAomanual_start_*',
        'performance_newAomanual_query_begin_*',
        'performance_newAomanual_query_end_*',
        'performance_newAomanual_polling_*',
        'performance_newAomanual_finish_*'
    );

    // 所有的项目都放到resultSet里,
    $resultSet = array();

    // 特殊处理便捷管理页的性能
    if (strpos($logObject['target'], 'performance_emanage_') === 0
        && gettype($logObject['tc0']) === 'string'
        && gettype($logObject['timestamp']) === 'string'
    ) {
        $timestamp = intval($logObject['timestamp']);
        $tc0 = intval($logObject['tc0']);
        $resultSet[] = array(
            'value' => ($timestamp - $tc0),
            'item' => $logObject['target'],
            'target' => $logObject['target'],
            'path' => $logObject['path']
        );
    }
    else {
        foreach($ITEMS as $i) {
            // 寻找logObject中符合$i描述的key
            foreach($logObject as $k => $v) {
                if (keyMatches($k, $i)) {
                    $resultSet[] = array(
                        'value' => $v,
                        'item' => $k,
                        'target' => $logObject['target'],
                        'path' => $logObject['path']
                    );
                }
            }
        }
    }

    return $resultSet;
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
 * 对传入的DQuery对象进行统计
 */
function doStat($DQ) {
    return $DQ->group(
        array('path', 'item', 'target')
    )->each(
        DQuery::sort('value', 'asc')
            ->process(StatProcessor)
    )->select(array(
        'item', 'target', 'path', 'pv', 'average', 't50', 't80', 't95', 'gte100'
    ))->sort(array('path', 'target', 'item'));
}

/**
 * 将数据转成JSON输出
 */
function toJsonOutput($nouse, $fields) {
    return json_encode($fields)."\n";
}

$jsonLogs = DQuery::input()
    ->select(extractLogData);

// 1, 过滤events_before_dumped
//    收集出现了events_before_dumped的session id
$eventsSessions = $jsonLogs
    ->filter(array(
        array('target', '==', 'performance_events_before_dumped'),
        array('events', '!=', '')
    ))
    ->select(array('logSessionId', '__hasEvents' => true));

// 2, 基础过滤
$n2Filtered = $jsonLogs
    ->filter(array(
        // 过滤targets
        array('target', 'in', array(
            'performance_static' => s1,
            'performance_materialList' => 1,
            'performance_accountTree' => 1,
            'performance_ao_manual' => 1,
            'performance_newAomanual' => 1,
            'timeline' => 1
        )),
        // 过滤pageStabled
        array('pageStabled', '!=', '1'),
        // 过滤logVersion
        array('logVersion', '==', '3.0'),
        // 过滤iframeShowed
        array('iframeShowed', '==', null)
    ))
    ->filter(filterPageInactived)
    ->leftJoin($eventsSessions, 'logSessionId')
    ->filter(filterEventsBeforeDumped)
    ->select(selectItems);

// 3, 分target和path排序，并统计
$n2Stat = doStat($n2Filtered);

$n2Stat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvanaII_hourly",
    "凤巢前端性能_nirvanaII_小时",
    null,
    true
);

$n2Stat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvanaII_json_hourly",
    "凤巢前端性能_nirvanaII_json_小时",
    'toJsonOutput',
    true
);

/*****************************
 * 第二部分，计算nirvana的性能
 */

/**
 * 过滤isBlankOpened: true
 */
function filterIsBlankOpened($logObject) {
    return is_null($logObject['isBlankOpened'])
        || $logObject['isBlankOpened'] !== true;
}

/**
 * 过滤performance_static: -1
 */
function filterPerformanceStaticNeg($logObject) {
    return is_null($logObject['performance_static'])
        || $logObject['performance_static'] != -1;
}

/**
 * 若是便捷管理页，过滤'看排名'
 */
function filterCorewords($logObject) {
    return is_null($logObject['firstSelPkgId']) ||
        $logObject['firstSelPkgId'] == 4;
}

/**
 * 过滤isLoadingDumpped
 */
function filterIsLoadingDumpped($logObject) {
    return is_null($logObject['isLoadingDumpped']) ||
        $logObject['isLoadingDumpped'] != true;
}

// 1, 基础过滤
$nFiltered = $jsonLogs
    ->filter(array(
        // 过滤targets
        array('target', 'in', array(
            'performance_static' => s1,
            'performance_materialList' => 1,
            'performance_accountTree' => 1,
            'performance_ao_manual' => 1,
            'performance_static' => 1,
            'performance_emanage_action_enter' => 1,
            'performance_emanage_action_render' => 1,
            'performance_emanage_action_rendered' => 1,
            'performance_emanage_sidebar_processed' => 1,
            'performance_emanage_coreword_is_stable' => 1,
            'performance_emanage_sidebar_AccountInfo_rendered' => 1,
            'performance_emanage_sidebar_ActDataView_rendered' => 1,
            'performance_emanage_sidebar_Coupon_rendered' => 1,
            'performance_emanage_sidebar_MarketTrend_rendered' => 1,
            'performance_emanage_sidebar_NoVPunish_rendered' => 1,
            'performance_emanage_sidebar_AccountScore_rendered' => 1,
            'performance_emanage_sidebar_LxbStatus_rendered' => 1,
            'performance_emanage_aopkg_rendered' => 1,
            'performance_emanage_aopkg_enter' => 1
        )),
        // 过滤logVersion
        array('logVersion', '!=', '3.0'),
        array('logVersion', '!=', '2.5')
    ))
    ->filter(filterPerformanceStaticNeg)
    ->filter(filterIsBlankOpened)
    ->filter(filterPageInactived)
    ->filter(filterCorewords)
    ->filter(filterIsLoadingDumpped)
    ->select(selectItems);

// 2, 分target和path排序，并统计
$nStat = doStat($nFiltered);

$nStat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvana_hourly",
    "凤巢前端性能_nirvana_小时",
    null,
    true
);

$nStat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvana_json_hourly",
    "凤巢前端性能_nirvana_json_小时",
    'toJsonOutput',
    true
);
