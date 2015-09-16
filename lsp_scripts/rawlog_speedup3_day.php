function mySelect($fields)
{
    $res=array();
    $res['tag'] = 0;
    if (
        (preg_match('/^.*"target":"performance_\w+".*$/', $fields['_OriginalLogLine'])
            || preg_match('/^.*"target":"timeline".*$/', $fields['_OriginalLogLine']))
        && preg_match('/^.*"logVersion":"3.0".*$/', $fields['_OriginalLogLine'])
        && !preg_match('/^.*"pageStabled":1.*$/', $fields['_OriginalLogLine'])
        && !preg_match('/^.*."pageInactived":[1-9]+.*$/', $fields['_OriginalLogLine'])
    ) {
        $res['lineData'] = $fields['_OriginalLogLine'];
        $res['tag'] = 1;
    }
    return $res;
}

DQuery::input()
    ->select(mySelect)
    ->filter(array("tag", "!=", 0))
    ->select(array("lineData"))
    ->outputAsFile("fengchao_feview_performance_rawlog_speedup3_day", "fengchao_feview_performance_rawlog_speedup3_day",null,true);