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
        // 'performance_static_*',
        // 'performance_manage_*',
        // 'performance_manage_account_tree_*',
        // 新AO timeline 相关
        // 'performance_manage_new_aomanual_*',
        // 新AO相关
        'performance_newAomanual',
        'performance_newAomanual_*'
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

function getTimelineMetrics($offset, $len) {
    $timelineMetrics = array(
        'performance_static_html_parse',
        'performance_static_css_loaded',
        'loading-global-start',
        'performance_static_js_sync_loaded',
        'performance_static_basicInfo_prefetch_sent',
        'performance_static_js_async_loaded',
        'performance_static_require_fc',
        'performance_static_attach_skin',
        'performance_static_reset_map',
        'performance_static_config_er',
        'performance_static_trigger_logo',
        'performance_static_register_action',
        'performance_static_basicInfo_start',
        'performance_static_basicInfo_finish',
        'performance_static_basicInfo_process',
        'performance_static_er_start',
        'performance_static_er_inited',
        'performance_monitor_config_start',
        'performance_monitor_config_finish',
        'performance_manage_actionloaded',
        'performance_manage_enteraction',
        'performance_manage_enter',
        'performance_manage_beforemodelload',
        'performance_manage_load_navinfo',
        'performance_manage_load_materiallist',
        'performance_manage_load_materialsum',
        'performance_manage_load_materiallistbyexpath',
        'performance_manage_load_summary',
        'performance_manage_load_materialsum',
        'performance_manage_load_coupons',
        'performance_manage_load_winfofolders',
        'performance_manage_load_xiconinfoloaded',
        'performance_manage_load_matchfactor',
        'performance_manage_load_level',
        'performance_manage_load_couponinfo',
        'performance_manage_load_labstat',
        'performance_manage_load_optsug',
        'performance_manage_load_bidsimulatorinfo',
        'performance_manage_load_xloaderfinished',
        'performance_manage_load_bulletin',
        'performance_manage_load_account_tree',
        'performance_manage_account_tree_start',
        'performance_manage_account_tree_inited',
        'performance_manage_account_tree_rendered',
        'performance_manage_account_tree_data_loaded',
        'performance_manage_account_tree_init_behavior',
        'performance_manage_account_tree_displayed',
        'performance_manage_ao_manual_start',
        'performance_manage_ao_manual_nirvana_base_loaded',
        'performance_manage_ao_manual_ui_inited',
        'performance_manage_ao_manual_js_async_loaded',
        'performance_manage_ao_manual_control_started',
        'performance_manage_ao_manual_responserender_0',
        'performance_manage_ao_manual_responserender_1',
        'performance_manage_ao_manual_responserender_2',
        'performance_manage_ao_manual_responserender_3',
        'performance_manage_ao_manual_requeststart_0',
        'performance_manage_ao_manual_requeststart_1',
        'performance_manage_ao_manual_requeststart_2',
        'performance_manage_ao_manual_requeststart_3',
        'performance_manage_ao_manual_finished',
        'performance_manage_modelloaded',
        'performance_manage_beforerender',
        'performance_manage_rendered',
        'performance_manage_initbehavior',
        'performance_manage_custombehavior',
        'performance_manage_entercomplete',
        'performance_manage_enteractioncomplete',
        'performance_manage_enteractionfail',
        // ao新手动版摘要轮询埋点
        'performance_manage_new_aomanual_start',
        'performance_manage_new_aomanual_query_begin0',
        'performance_manage_new_aomanual_query_end0',
        'performance_manage_new_aomanual_polling1',
        'performance_manage_new_aomanual_query_begin1',
        'performance_manage_new_aomanual_query_end1',
        'performance_manage_new_aomanual_polling2',
        'performance_manage_new_aomanual_query_begin2',
        'performance_manage_new_aomanual_query_end2',
        'performance_manage_new_aomanual_query_end1',
        'performance_manage_new_aomanual_polling3',
        'performance_manage_new_aomanual_query_begin3',
        'performance_manage_new_aomanual_query_end3',
        'performance_manage_new_aomanual_finish'
    );
    return array_slice($timelineMetrics, $offset, $len);
}

/**
 * 统计processor，上游送来group过的，按topK排序过的性能指标，最慢的K个，从慢到快排序
 */
class StatProcessor implements \IUserProcessor {
    private $values;
    private $count;

    public function init() {
        $this->values = array();
        $this->count = 0;
    }

    public function process($fields) {
        if ($this->count == 0) {
            $this->count = $fields['count'];
        }
        $this->values[] = $fields['value'];    
    }

    public function fini() {
        // 在只有topK的情况下尽可能的算出50、80、95分位值
        
        // 结果存放处
        $res = array();
        $res['pv'] = $this->count;
        $topKcount = count($this->values);
        if ($topKcount == $this->count) {
            // 等于总count的情况，values就是数据全集，求出50、80、95分位值
            $res['t95'] = $this->values[floor($this->count * 0.05)];
            $res['t80'] = $this->values[floor($this->count * 0.20)];
            $res['t50'] = $this->values[floor($this->count * 0.50)];
        }
        else if ($topKcount < $this->count) {
            // topK小于总count的情况，values是部分，尽量算
            // 95分位值
            $pos = floor($this->count * 0.05);
            if ($pos <= $topKcount) {
                $res['t95'] = $this->values[$pos];
            }
            // 80分位值
            $pos = floor($this->count * 0.20);
            if ($pos <= $topKcount) {
                $res['t80'] = $this->values[$pos];
            }
            // 50分位值
            $pos = floor($this->count * 0.50);
            if ($pos <= $topKcount) {
                $res['t50'] = $this->values[$pos];
            }
        }
        // else, topKcount大于总count，不可能出现

        return $res;
    }
}

/**
 * 计算平均数和因大于100s被筛掉的log
 */
class AverageProcessor implements \IUserProcessor {
    private $sum;
    private $count;

    // 因大于100s而过滤的pv
    private $gte100Count;

    public function init() {
        $this->sum = 0;
        $this->count = 0;
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

        $this->sum += $v;
        $this->count++;
    }

    public function fini() {
        return array(
            'count' => $this->count,
            'average' => $this->sum / $this->count,
            'gte100' => $this->gte100Count
        );
    }
}

/**
 * 对传入的DQuery对象进行统计
 */
function doStat($DQ) {
    // 先定下分组条件
    $groupCond = array('path', 'item', 'target');
    // 原始log按照path、item、target分组
    $grouped = $DQ->group($groupCond);
    // 算平均数，gte100
    $averaged = $grouped->each(
        DQuery::process(AverageProcessor)
    )
    ->select(array('path', 'item', 'target', 'average', 'gte100', 'count'));
    // 原始log滤掉负数和大于100s
    $filtered = $DQ->filter(array(
        array('value', '<=', 100000),
        array('value', '>', 0)
    ));
    // 原始log求topK，K定为 (100, 000)，这样可以算出最大(2, 000, 000)(200w)
    // 个pv的95分位值
    // 然后混上average
    return $filtered
        ->group($groupCond)
        ->topEach('value', 100000)
        ->leftJoin($averaged, $groupCond)
        ->group($groupCond)
        ->each(
            DQuery::sort('value', 'desc')
                ->process(StatProcessor)
        )
        ->select(array(
            'item', 'target', 'path', 'pv', 'average', 't50', 't80', 't95', 'gte100'
        ))->sort($groupCond);
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

function filterNirvanaIILogs($logObject) {
    // 过滤target
    if (!in_array($logObject['target'], array(
        'performance_static',
        'performance_materialList',
        'performance_accountTree',
        'performance_newAomanual'
    ))) {
        return false;
    }
    // 过滤pageStabled，logVersion
    if ($logObject['pageStabled'] == '1') {
        return false;
    }
    if ($logObject['logVersion'] != '3.0') {
        return false;
    }
    // 如果是A点，则通过filter，否则，需要查actionfwd，等于1则通过filter
    if ($logObject['target'] == 'performance_static') {
        return true;
    }

    if ($logObject['actionfwd'] == 1) {
        return true;
    }

    return false;
}

function filterNirvanaIITimelineLogs($logObject) {
    if ($logObject['target'] != 'timeline') {
        return false;
    }
    if ($logObject['pageStabled'] == '1') {
        return false;
    }
    if ($logObject['logVersion'] != 3.0) {
        return false;
    }
    if ($logObject['actionfwd'] == 1) {
        return true;
    }
    return false;
}

// 2, 基础过滤
$n2Filtered = $jsonLogs
    ->filter(filterNirvanaIILogs)
    ->filter(filterPageInactived)
    ->leftJoin($eventsSessions, 'logSessionId')
    ->filter(filterEventsBeforeDumped)
    ->select(selectItems);

// 3, 分target和path排序，并统计
$n2Stat = doStat($n2Filtered);

$n2timelineFiltered = $jsonLogs
    ->filter(filterNirvanaIITimelineLogs)
    ->filter(filterPageInactived)
    ->leftJoin($eventsSessions, 'logSessionId')
    ->filter(filterEventsBeforeDumped);

function metricPicker($logObject, $items) {
    $result = array();
    foreach($items as $item) {
        foreach($logObject as $k => $v) {
            if (keyMatches($k, $item)) {
                $result[] = array(
                    'value' => $v,
                    'item' => $k,
                    'target' => $logObject['target'],
                    'path' => $logObject['path']
                );
            }
        }
    }
    return $result;
}
function metricSelector1($logObject) {
    return metricPicker($logObject, getTimelineMetrics(0, 5));
}
function metricSelector2($logObject) {
    return metricPicker($logObject, getTimelineMetrics(5, 5));
}
function metricSelector3($logObject) {
    return metricPicker($logObject, getTimelineMetrics(10, 5));
}
function metricSelector4($logObject) {
    return metricPicker($logObject, getTimelineMetrics(15, 5));
}
function metricSelector5($logObject) {
    return metricPicker($logObject, getTimelineMetrics(20, 5));
}
function metricSelector6($logObject) {
    return metricPicker($logObject, getTimelineMetrics(25, 5));
}
function metricSelector7($logObject) {
    return metricPicker($logObject, getTimelineMetrics(30, 5));
}
function metricSelector8($logObject) {
    return metricPicker($logObject, getTimelineMetrics(35, 5));
}
function metricSelector9($logObject) {
    return metricPicker($logObject, getTimelineMetrics(40, 5));
}
function metricSelector10($logObject) {
    return metricPicker($logObject, getTimelineMetrics(45, 5));
}
function metricSelector11($logObject) {
    return metricPicker($logObject, getTimelineMetrics(50, 5));
}
function metricSelector12($logObject) {
    return metricPicker($logObject, getTimelineMetrics(55, 5));
}
function metricSelector13($logObject) {
    return metricPicker($logObject, getTimelineMetrics(60, 5));
}
function metricSelector14($logObject) {
    return metricPicker($logObject, getTimelineMetrics(65, 5));
}
function metricSelector15($logObject) {
    return metricPicker($logObject, getTimelineMetrics(70, 5));
}
function metricSelector16($logObject) {
    return metricPicker($logObject, getTimelineMetrics(75, 5));
}
function metricSelector17($logObject) {
    return metricPicker($logObject, getTimelineMetrics(80, 5));
}
function metricSelector18($logObject) {
    return metricPicker($logObject, getTimelineMetrics(85, 5));
}

$n2Stat = $n2Stat
    ->union(doStat($n2timelineFiltered->select(metricSelector1)))
    ->union(doStat($n2timelineFiltered->select(metricSelector2)))
    ->union(doStat($n2timelineFiltered->select(metricSelector3)))
    ->union(doStat($n2timelineFiltered->select(metricSelector4)))
    ->union(doStat($n2timelineFiltered->select(metricSelector5)))
    ->union(doStat($n2timelineFiltered->select(metricSelector6)))
    ->union(doStat($n2timelineFiltered->select(metricSelector7)))
    ->union(doStat($n2timelineFiltered->select(metricSelector8)))
    ->union(doStat($n2timelineFiltered->select(metricSelector9)))
    ->union(doStat($n2timelineFiltered->select(metricSelector10)))
    ->union(doStat($n2timelineFiltered->select(metricSelector11)))
    ->union(doStat($n2timelineFiltered->select(metricSelector12)))
    ->union(doStat($n2timelineFiltered->select(metricSelector13)))
    ->union(doStat($n2timelineFiltered->select(metricSelector14)))
    ->union(doStat($n2timelineFiltered->select(metricSelector15)))
    ->union(doStat($n2timelineFiltered->select(metricSelector16)))
    ->union(doStat($n2timelineFiltered->select(metricSelector17)))
    ->union(doStat($n2timelineFiltered->select(metricSelector18)));

$n2Stat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvanaII_test_daily",
    "fengchao_feview_performance_jsonlog_nirvanaII_test_daily",
    null,
    true
);

$n2Stat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvanaII_json_test_daily",
    "fengchao_feview_performance_jsonlog_nirvanaII_json_test_daily",
    'toJsonOutput',
    true
);
