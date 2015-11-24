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
        'performance_static_*',
        'performance_manage_*',
        'performance_manage_account_tree_*',
        // table repaint
        'performance_materialList_table_repaint_*',
        // 新AO timeline 相关
        'performance_manage_new_aomanual_*',
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

/**
 * 统计processor，上游送来group过的，按topK排序过的性能指标。在这里计算分位值和pv。
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
    // 原始log求topK，K定为 (300, 000)，这样可以算出最大(6, 000, 000)(600w)
    // 个pv的95分位值
    // 然后混上average
    return $filtered
        ->group($groupCond)
        ->topEach('value', 300000)
        ->leftJoin($averaged, $groupCond)
        ->group($groupCond)
        ->processEach(StatProcessor)
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

// 2, 基础过滤
$n2Filtered = $jsonLogs
    ->filter(array(
        // 过滤targets
        array('target', 'in', array(
            'performance_static' => 1,
            'performance_materialList' => 1,
            'performance_accountTree' => 1,
            'performance_newAomanual' => 1,
            'performance_materialList_table_repaint' => 1,
            'timeline' => 1
        )),
        // 过滤pageStabled
        array('pageStabled', '!=', '1'),
        // 过滤logVersion
        array('logVersion', '==', '3.0'),
        // 过滤iframeShowed
        array('iframeShowed', '==', null),
        // 过滤actionfwd，只找跳转过1次的
        array('actionfwd', '==', 1)

    ))
    ->filter(filterPageInactived)
    ->leftJoin($eventsSessions, 'logSessionId')
    ->filter(filterEventsBeforeDumped)
    ->select(selectItems);

// 3, 分target和path排序，并统计
$n2Stat = doStat($n2Filtered);

$n2Stat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvanaII_daily",
    "凤巢前端性能_nirvanaII_天",
    null,
    true
);

$n2Stat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvanaII_json_daily",
    "凤巢前端性能_nirvanaII_json_天",
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
        || $logObject['isBlankOpened'] == '';
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
        $logObject['isLoadingDumpped'] == '';
}

// 1, 基础过滤
$nFiltered = $jsonLogs
    ->filter(array(
        // 过滤targets
        array('target', 'in', array(
            'performance_static' => 1,
            'performance_materialList' => 1,
            'performance_accountTree' => 1,
            'performance_ao_manual' => 1,
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
    "fengchao_feview_performance_jsonlog_nirvana_daily",
    "凤巢前端性能_nirvana_天",
    null,
    true
);

$nStat->outputAsFile(
    "fengchao_feview_performance_jsonlog_nirvana_json_daily",
    "凤巢前端性能_nirvana_json_天",
    'toJsonOutput',
    true
);
