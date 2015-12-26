/**
 * 输出$object的调试信息。直接返回$object使得该函数可以直接作为select()的参数。
 */
function debugPrint($object) {
    fprintf(STDERR, print_r($object, true));
    return $object;
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
        $this->values[] = $fields['spent'];    
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
 * 计算平均数的processor
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
        $v = $fields['spent'];
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
            'ajaxPath' => $req->path,
            'spent' => floatval($object['spent'])
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

// 先拿ajax基本信息
$ajaxLogs = DQuery::input()
    ->select(extractLogData)
    ->filter(array('target', '==', 'ajaxInfo'))
    ->select(extractAjaxSuccData);

// 原始ajax按path分组，算 average, gte100
$avgAjaxLogs = $ajaxLogs
    ->group(array('path', 'ajaxPath'))
    ->each(
        DQuery::process(AverageProcessor)
    )
    ->select(array('path', 'ajaxPath', 'count', 'average', 'gte100'));

// 过滤负数和大于100000ms的ajax
$filteredAjaxLogs = $ajaxLogs
    ->filter(array(
        array('spent', '<=', 100000),
        array('spent', '>', 0)
    ));


// filtered ajax算topK
// K定为 (300, 000)，这样可以算出最大(6, 000, 000)(600w)个pv的95分位值
// 然后混上average
$topK = $filteredAjaxLogs
    ->group(array('path', 'ajaxPath'))
    ->topEach('spent', 300000)
    ->leftJoin($avgAjaxLogs, array('path', 'ajaxPath'));

$stat = $topK
    ->group(array('path', 'ajaxPath'))
    ->each(
        DQuery::sort('spent', 'desc')
            ->process(StatProcessor)
    )
    ->select(array(
        'path', 'ajaxPath', 'count', 'average', 't50', 't80', 't95', 'gte100'
    ))
    ->sort(array('path', 'ajaxPath', 'count'));

$stat->outputAsFile(
    'fengchao_feview_ajax_jsonlog_ajax_info_succ',
    '凤巢前端AJAX性能日志_来自ajaxInfo',
    null,
    true
);

$stat->outputAsFile(
    'fengchao_feview_ajax_jsonlog_ajax_info_succ_json',
    '凤巢前端AJAX性能日志_来自ajaxInfo_json',
    'toJsonOutput',
    true
);
