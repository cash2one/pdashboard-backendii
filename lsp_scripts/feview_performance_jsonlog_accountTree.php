/**
 * 计算 账户树 首屏与非首屏加载的pv和性能
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
 * 整理账户树数据。
 */
function extractAcctTreeData($object) {
    $spent = floatval($object['performance_accountTree_start_0'])
        - floatval($object['performance_accountTree_finish_3']);
    return array(
        'path' => $object['path'],
        'spent' => $spent,
        'pageStabled' => $object['pageStabled']
    );
}

$acctTreeLogs = DQuery::input()
    ->select(extractLogData)
    ->filter(array(
        array('target', '==', 'performance_accountTree'),
        // 过滤logVersion
        array('logVersion', '==', '3.0'),
        // 过滤iframeShowed
        array('iframeShowed', '==', null)
    ))
    ->select(extractAcctTreeData)
    ->group(array('path', 'pageStabled'))
    ->each(
        DQuery::sort('spent', 'asc')
            ->process(StatProcess)
    )

