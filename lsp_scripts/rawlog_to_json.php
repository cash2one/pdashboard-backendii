ini_set('pcre.backtrack_limit', 999999999);



function expand($fields)
{
    if($fields['_Source']==4)
    {
        $rawLine = $fields['_OriginalLogLine'];
        $res['_LogDate']=null;
        $res['_LogTime']=null;
        $res['_Category']=null;
        $res['_Function']=null;
        $res['_UserId']=null;
        $res['_OptId']=null;
        $res['_Param']=null;
        $res['_Path']=null;
        $res['_ClientIp']=null;
        $res['_Source']=null;
        $res['_UStatus']=null;
        $res['_Target']=null;
        
        $line = $rawLine;
        $line = iconv("gbk","utf8",$line);
        
       if(preg_match('/^.*logData=(.*),\s*userid=\d*,\s*nav=.*$/',$line,$matches))
       {
               
               $find = $matches[1]; 
               $dataarr = json_decode($find ,true);     
       }else if(preg_match('/^.*logData=(.*),\s*nav=.*,\s*userid=.*$/',$line,$matches))
       {
               
               $find = $matches[1]; 
               $dataarr = json_decode($find ,true);     
       }

       $line = str_replace($find,"\"\"",$line);
   
        
        if(preg_match('/^\d*\.\d*\.\d*\.\d*\s*(\d*\.\d*\.\d*\.\d*)\s\-\s\-\s\[(\d{2}\/[a-zA-Z]*\/\d{4}):(\d{2}:\d{2}:\d{2})\s.*arguments=\{(.*)\}\].*$/', $line, $twomatches))
         {
               $processParam=$twomatches[4];
               $processParam=str_replace("\t","",$processParam);
           
                $paramMap=array();
                //使用=号切割，从后向前回溯，解决了value中含有,space 的问题
                $allParams=explode('=',$processParam);
                $key = null;
                $value=null;
                $paramCount = count($allParams);
                                            
 
                //init paramMap  
                for($i=$paramCount-1;$i>=0;$i--)
                {
                    if($i==$paramCount-1) 
                    {
                        $value=$allParams[$i];
                        continue;
                    }
                    if($i==0) 
                    {
                        $key=$allParams[$i];
                        $paramMap[$key]=$value;
                    }else
                    {
                        $lastCommaIndex =strripos($allParams[$i],', ');
                        $key =     substr(    $allParams[$i],$lastCommaIndex+2);
                         $paramMap[$key]=$value;
                        $value = substr($allParams[$i],0,$lastCommaIndex);
                    }
                }
 
                //no loop item
                $tmpDate=str_replace("/","-",$twomatches[2]);
                $res['_LogDate']=date("Y-m-d",strtotime("$tmpDate"));
                $res['_LogTime']=$twomatches[3];
                $res['_Category']="stat";
                $res['_Function']="fclogimg.gif";
                $res['_UserId']=$paramMap['userid'];
                $res['_OptId']=$paramMap['optid'];
                $res['_ClientIp']=$twomatches[1];
                $res['_Source']=2; //front
                 if($res['_UserId']===$res['_OptId'])
                {
                     $res['_UStatus']=0;//用户
                }else
                {
                     $res['_UStatus']=1;//管理员
                }
                
                $tempRes = $res;
                foreach($dataarr  as $dv)
                {
                    
                    $tempParamMap = array_merge($paramMap,$dv);
                    //loop item
                    $tempRes['_Path']=$tempParamMap['path'];
                    $paramArr=array();
                    foreach($tempParamMap as $k=>$v)
                    {
                        if(gettype($v)=="string"&&( strpos($v,'{')===0||strpos($v,'"')===0))
                        {
                            $paramArr[]="\"".$k."\":".$v."";
                        }else if(gettype($v) =="array")
                        {
                             $paramArr[]="\"".$k."\":".json_encode($v)."";
                        } else
                        {
                            $paramArr[]="\"".$k."\":\"".$v."\"";
                        }
                        
                    }
                    $tempRes['_Param']="{".implode(",",$paramArr)."}";
                    $tempRes['_OriginalLogLine'] = preg_replace("/arguments=\{.*\}/",'arguments={'.implode(",",$paramArr).'}',$twomatches[0]);
                    $tempRes['_Target']="{".implode(",",$paramArr)."}";
                    $resultSet[] = $tempRes;

                    
                    $tempRes = $res;
                }
                
         }
    }else{
        $fields['_Target']=$fields['_Param'];
        $resultSet[]= $fields;
    }
    
    return $resultSet;

}

 

function appendHost($fields)
{
    $curPath=getenv("map_input_file");
    $curPathArr=explode("/",$curPath);
    $hostid=$curPathArr[sizeof($curPathArr)-2];
    
    
    $fields['_AppServerIp']=$hostid;
    $fields['_Host']=$hostid;
 
    return $fields;
}

function outputFunction($nouse,$fields)
{
     $resultStr="";
     $resultStr.="{\"".logtime."\":\"".$fields['_LogDate']." ".$fields['_LogTime']
                  ."\",\"appserverip\":\"".$fields['_AppServerIp']
                  ."\",\"category\":\"".$fields['_Category']
                  ."\",\"msg\":{\"function\":\"".$fields['_Function']
                  ."\",\"userid\":\"".$fields['_UserId']
                  ."\",\"host\":\"".$fields['_Host']
                  ."\",\"optid\":\"".$fields['_OptId']
                  ."\",\"path\":\"".$fields['_Path']
                  ."\",\"param\":".$fields['_Param']."}}\n";
     
     
     return $resultStr;
}

$fclog=DQuery::input();

$fclog
->filter(array(array("_Source","==","1")))
->select("appendHost")
->select(array("_LogDate","_LogTime","_Category","_Function","_UserId","_OptId","_Param","_Path","_ClientIp","_AppServerIp","_Host"))
->outputAsFile("fclog_back_view_out","涅磐日志后端视图","outputFunction");


function staticFilter($fields)
{
   if($fields['_Source']=="2"||$fields['_Source']=="4")
   {
       return true;
   }
   return false;

}

$fclog
->filter("staticFilter")
->select("expand")
->select("appendHost")
->select(array("_LogDate","_LogTime","_Category","_Function","_UserId","_OptId","_Param","_Path","_ClientIp","_AppServerIp","_Host"))
->outputAsFile("fclog_front_view_out","涅磐日志前端视图","outputFunction",true);
 
 
 