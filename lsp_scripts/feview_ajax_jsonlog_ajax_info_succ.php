/**
 * 输出$object的调试信息。直接返回$object使得该函数可以直接作为select()的参数。
 */
function debugPrint($object) {
    fprintf(STDERR, print_r($object, true));
    return $object;
}

/**
 * 计算95分位值的processor，上游送来top排序且有总count的数据
 */
class T95Processor implements \IUserProcessor {
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
        $topKcount = count($this->values);
        $t95 = -1;
        // 局部排序后的values，topKcount要么等于总count，要么小于总count
        if ($topKcount == $this->count) {
            // 等于总count的情况，t95是处于5%位置的值。
            $t95 = $this->values[floor($topKcount * 0.05)];
        }
        else if ($topKcount < $this->count) {
            // 小于总count的情况，算出总count的5%的量
            $pos = floor($this->count * 0.05);
            if ($pos <= $topKcount) {
                // 所要的数目在部分排序的数字里
                $t95 = $this->values[$pos];
            }
            else {
                // pv太大，topK也未能包含，记一个错误(-2)
                $t95 = -2;
            }
        }
        // else, topKcount大于总count，不可能出现，t95维持-1，表示另一种错误

        return array(
            't95' => $t95
        );
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

// 过滤负数和大于100000ms的ajax
$filteredAjaxLogs = $ajaxLogs
    ->filter(array(
        array('spent', '<=', 100000),
        array('spent', '>', 0)
    ));

// 原始ajax按path分组，算 average, gte100
$byPath = $ajaxLogs
    ->group(array('path', 'ajaxPath'));
$avgAjaxLogs = $byPath
    ->each(
        DQuery::process(AverageProcessor)
    )
    ->select(array('path', 'ajaxPath', 'count', 'average', 'gte100'));

// filtered ajax算topK
// K定为 (300, 000)，这样可以算出最大(6, 000, 000)(600w)个pv的95分位值
// 然后混上average
$topK = $filteredAjaxLogs
    ->group(array('path', 'ajaxPath'))
    ->topEach('spent', 300000)
    ->leftJoin($avgAjaxLogs, array('path', 'ajaxPath'));

$stat = $topK
    ->group(array('path', 'ajaxPath'))
    ->processEach(T95Processor)
    ->select(array('path', 'ajaxPath', 'count', 'average', 't95', 'gte100'))
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
