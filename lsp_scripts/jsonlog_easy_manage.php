function debugPrint($object) {
    fprintf(STDERR, print_r($object, true));
    return $object;
}

function mySelect($fields) {
    // $line = iconv('gbk', 'utf-8', $fields['_Line']);
    $line = $fields['_Line'];
    $logObject = json_decode($line);
    $msgObject = $logObject->msg;
    return array(
        'msg' => $msgObject
    );
}

function filterTarget($fields) {
    $msg = $fields['msg'];
    $target = $msg->param->target;
    $path = $msg->param->path;
    return (
        $path == '/overview/index'
        && (
            strpos($target, 'performance_emanage_') == 0 ||
            $target == 'performance_static'
        )
        && (
            $msg->param->pageInactived == NULL
            || $msg->param->pageInactived == 0        
        )
    );
}

function filterFirstLoading($fields) {
    $msg = $fields['msg'];
    $param = $msg->param;
    return (
        $param->target == 'performance_static'
        || (
            $param->firstSelPkgId == 4  // 初始打开‘看排名’
            && !$param->isBlankShowed   // 首屏载入的不是nirvanaII
            && !$param->isLoadingDumpped // 在这之前管理页的B、C、D点没有发过
        )
    );
}

function generateOutput($fields) {
    $ret = array();
    $param = $fields['msg']->param;
    return array('line'=>json_encode($param));
}

DQuery::input()
    ->select(mySelect)
    ->filter(filterTarget)
    ->filter(filterFirstLoading)
    ->select(generateOutput)
    ->outputAsFile("fengchao_feview_performance_easy_manage", "fengchao_feview_performance_easy_manage", null, true);