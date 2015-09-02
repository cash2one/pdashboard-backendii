#Author liyang12@baidu.com
#Version 5.0
#Time 2013-03-19
#Desc Get LSP item to local/获取LSP统计任务输出,若未产出会等待300秒重试

#==============================  Help  ===========================================================================================#
#必选的第一个参数：统计项的名称，具体的名字详见统计任务。线上（默认）：http://online.log.baidu.com/，线下：http://log.baidu.com/
#-s 开始日期=========>-s 20121021 #默认昨天
#-f 结束日期=========>-f 20121023 #默认和开始日期相同
#-b 开始分钟=======>-b 00 #默认0点，01:30代表1点30
#-e 结束分钟=======>-e 23 #默认23点。注意：若开始、结束小时数仅设置一个，则视为只下载一个时间点的数据，开始结束保持一致。
#-o 加上此参数代表下载“线下”的任务，默认不加代表“线上”。
#-h 此参数控制任务的下载级别，如天级别、小时级别、半小时等，用秒数为值。小时级别就是3600，默认不加是“天”级的。
#-m 代表下载md5文件，并且验证md5，若不通过会重新下载。
#-l 保存路径=========>-l /home/work/liyang/data #默认当前路径
#============================== Example ==========================================================================================#
#sh get_item.sh ct439_crm                                              获取 线上 昨天的439任务的统计项结果（天级）
#sh get_item.sh fclog_back_view_out_t -s 20121030 -h 3600 -o           获取 线下 20121030的涅盘日志后端处理统计任务结果（小时级）
#sh get_item.sh fclog_back_view_out_t -s 20121030 -h 3600 -o -b 01:00  获取 线下 20121030的1点涅盘日志后端处理统计任务结果（小时级）
#============================== Source this ======================================================================================#
#如果要Source这个脚本，就将最后一行的调用方法注释掉。
#=================================================================================================================================#

#!/bin/bash

function getItemFromLSP()
{
    local log_name=$1
    local log_date=$2
    local log_time=$3
    local save_base=$4
    local is_offline=$5
    local need_md5=$6
    local save_folder=${save_base}/${log_name}/${log_date}/${log_time}
    local lsp_baseurl_offline="http://logdata.baidu.com/?m=Data&a=GetData&token=ecom_fengchao_0573nk69qnfj0dj3dp&product=ecom_fengchao&item=${log_name}&date=${log_date}%20${log_time}"
    local ftp_url_offline="ftp://lsp_ecom_fengchao:ecom_fengchao_0573nk69qnfj0dj3dp@nj01-yulong-data.dmop.baidu.com/${log_name}/${log_date}/${log_time}/${log_name}"
    local lsp_baseurl_online="http://online.logdata.baidu.com/?m=Data&a=GetData&token=ecom_fengchao_0573nk69qnfj0dj3dp&product=ecom_fengchao&item=${log_name}&date=${log_date}%20${log_time}"
    local ftp_url_online="ftp://lsponline_ecom_fengchao:ecom_fengchao_0573nk69qnfj0dj3dp@nj01-yulong-data.dmop.baidu.com/${log_name}/${log_date}/${log_time}/${log_name}"
    local wget_cmd="wget -T 0 -t 50 --limit-rate=10M -O"

    if [ "${is_offline}" = "NO" ];then
	lsp_baseurl=${lsp_baseurl_online}
	ftp_url=${ftp_url_online}
    else
	lsp_baseurl=${lsp_baseurl_offline}
	ftp_url=${ftp_url_offline}
    fi

    if [ ! -d ${save_folder} ];then
	mkdir -p ${save_folder}
    fi

while [ 0 ]; do
	#1.get status	
    ${wget_cmd} ${save_folder}/${log_name}.status "${lsp_baseurl}&type=status"
    touch ${save_folder}/${log_name}.status
    STATUS=`awk -F'\t' '{print $2}' ${save_folder}/${log_name}.status`
    if [ "x${STATUS}" == "x1" ];then
		#2.get midoutlist
		local onefile=0
		local manyfile=0
		for((i=1;i<=5;i++));do
			${wget_cmd} ${save_folder}/${log_name}.midoutlist  "${lsp_baseurl}&type=midoutlist"
			onefile=`head ${save_folder}/${log_name}.midoutlist -n 1|grep ${log_name}|wc -l`
			manyfile=`head ${save_folder}/${log_name}.midoutlist -n 1|grep "000000"|wc -l`
			if [ "x${onefile}" == "x0" -a "x${manyfile}" == "x0" ];then
				sleep 60
		        echo "#########################################################################"
		        echo "getItemFromLSP======>${log_name} ${log_date} ${log_time} midoutlist not ready,wait 60 seconds,then retry"
				echo "#########################################################################"
				continue
			else
				break
			fi
		done

		#3.get data
		if [ "x${onefile}" == "x1" ];then
 			${wget_cmd} ${save_folder}/${log_name} "${lsp_baseurl}&type=midoutfile&file=${log_name}"
			#4.check md5
			if [ "${need_md5}" = "YES" ];then
				${wget_cmd} ${save_folder}/${log_name}.md5.bak "${lsp_baseurl}&type=md5"
				awk -F " " '{print $2"  "$1}' ${save_folder}/${log_name}.md5.bak > ${save_folder}/${log_name}.md5
				rm ${save_folder}/${log_name}.md5.bak
				cd ${save_folder}
				local md5check=`md5sum -c ${log_name}.md5|grep "FAILED"|wc -l`
				cd -
				if [ "x${md5check}" != "x0" ];then
					echo "getItemFromLSP======>${log_name} ${log_date} ${log_time} md5 not pass,retry"
					continue
				else
					echo "getItemFromLSP======>${log_name} ${log_date} ${log_time} md5 check pass"
				fi
			fi

		elif [ "x${manyfile}" == "x1" ];then
	    	awk -F'\t' '{print $1}' ${save_folder}/${log_name}.midoutlist | while read line; do
	    		local partno=$line
	    		${wget_cmd} ${save_folder}/part.part${partno} "${lsp_baseurl}&type=midoutfile&file=${partno}"
   			done

			#4.check md5
			if [ "${need_md5}" = "YES" ];then
				${wget_cmd} ${save_folder}/${log_name}.md5.bak "${lsp_baseurl}&type=md5"
				awk -F " " '{print $2"  part.part"$1}' ${save_folder}/${log_name}.md5.bak > ${save_folder}/${log_name}.md5
				${log_name}.md5.bak > ${save_folder}/${log_name}.md5
				rm ${save_folder}/${log_name}.md5.bak
				cd ${save_folder}
				local md5check=`md5sum -c ${log_name}.md5|grep "FAILED"|wc -l`
				cd -
				if [ "x${md5check}" != "x0" ];then
					echo "getItemFromLSP======>${log_name} ${log_date} ${log_time} md5 not pass,retry"
					continue
				else
					echo "getItemFromLSP======>${log_name} ${log_date} ${log_time} md5 part check pass"
				fi
			fi
				
			cat ${save_folder}/part.part* > ${save_folder}/${log_name}
			mv ${save_folder}/${log_name} ${save_base}/${log_name}.${log_date}${log_time}
			if [ "${need_md5}" = "YES" ];then	
   				md5sum ${save_folder}/${log_name}>${save_folder}/${log_name}.md5
			fi
			rm ${save_folder}/part.part*
   		
		else
			continue
		fi
		
		rm ${save_folder}/${log_name}.status
		rm ${save_folder}/${log_name}.midoutlist
		local new_name=${log_name}.${log_date}${log_time}
		if [ "${DOWNLOAD_LEVEL}" = "86400" ];then
			new_name=${log_name}.${log_date}
		fi
		mv ${save_folder}/${log_name} ${save_base}/${new_name}
        echo "@${save_base}/${new_name}@"
		if [ "${need_md5}" = "YES" ];then
		    mv ${save_folder}/${log_name}.md5 ${save_base}/${new_name}.md5
		fi
		rmdir ${save_folder}
		

		echo "#########################################################################"
		echo "getItemFromLSP======>${log_name} ${log_date} ${log_time} data done"
		echo "#########################################################################"
		break
    elif [ "x${STATUS}" == "x0" ];then
		echo "#########################################################################"
		echo "getItemFromLSP======>${log_name} ${log_date} ${log_time} data not ready,wait 300 seconds,then retry"
		echo "#########################################################################"
		sleep 300
    else
		#item is not exist
		rm ${save_folder}/${log_name}.status
		rmdir ${save_folder}
		rmdir ${save_base}/${log_name}/${log_date}
		rmdir ${save_base}/${log_name}
		rmdir ${save_base}
		echo "#########################################################################"
        echo "getItemFromLSP======>${log_name} is error,return"
		echo "#########################################################################"
		return -1
    fi

done
}

function get_item()
{
#======init input arg:begin=============
LOG_NAME=$1
shift $((1))

if [ x"${LOG_NAME}" = x ];then
    echo "Input invalid : Need Item_Name..."
    return -1
fi
echo "X${LOG_NAME}"|grep "^X-">/dev/null 2>&1
if [ $? -eq 0 ];then
    echo "Input invalid : Need Item_Name..."
    return -1
fi

IS_OFFLINE="NO"
DOWNLOAD_LEVEL="86400"
NEED_MD5="NO"

while getopts ":s:f:b:e:l:oh:m" arg
do
	case $arg in
	s)BEGIN_DATE=$OPTARG;;
	f)END_DATE=$OPTARG;;
	b)BEGIN_TIME=$OPTARG;;
	e)END_TIME=$OPTARG;;
	l)SAVE_FOLDER=$OPTARG;;
	o)IS_OFFLINE="YES";;
	h)DOWNLOAD_LEVEL=$OPTARG;;
	m)NEED_MD5="YES";;
	*)echo "unkown args:$OPTARG";;
        esac
done

#set default value
if [ x"${BEGIN_DATE}" = x ];then
        BEGIN_DATE=`date -d "-1day" +"%Y%m%d"`
fi

if [ x"${END_DATE}" = x ];then
	END_DATE=${BEGIN_DATE}
fi

if [ x"${BEGIN_TIME}" = x -a x"${END_TIME}" = x ];then
	BEGIN_TIME="00"
	END_TIME="23"
elif [ x"${BEGIN_TIME}" != x -a x"${END_TIME}" = x ];then
        END_TIME=${BEGIN_TIME}
elif [ x"${BEGIN_TIME}" = x -a x"${END_TIME}" != x ];then
	BEGIN_TIME=${END_TIME}
fi

if [ x"${SAVE_FOLDER}" = x ];then
        SAVE_FOLDER="."
fi

echo "ITEM_NAME:${LOG_NAME}"
echo "BEGIN_DATE:${BEGIN_DATE}"
echo "END_DATE:${END_DATE}"
echo "BEGIN_TIME of eachday:${BEGIN_TIME}"
echo "END_TIME of eachday:${END_TIME}"
echo "SAVE_FOLDER:${SAVE_FOLDER}"
echo "IS_OFFLINE:${IS_OFFLINE}"
echo "DOWNLOAD MD5:${NEED_MD5}"
#======init input arg:end=============

#======check:begin====================
if [ `expr ${BEGIN_DATE}` -gt `expr ${END_DATE}` ];then
	echo "Input invalid : [-b BEGIN_DATE] <= [-d END_DATE] is valid. eg: -b 20121021 -d 20121023"
	exit -1
fi

#if [ `expr ${BEGIN_TIME}` -gt `expr ${END_TIME}` ];then
#    echo "Input invalid : [-t BEGIN_TIME] <= [-n END_TIME] is valid"
#    exit -1
#fi
#======check:end=====================

#======get item each time:begin=======
echo "ITEM FREQUENCY:${DOWNLOAD_LEVEL}"
begin_long=`date -d "${BEGIN_DATE} ${BEGIN_TIME}" +"%s"`
end_long=`date -d "${END_DATE} ${END_TIME}" +"%s"`
add_time=${DOWNLOAD_LEVEL}
while [ ${begin_long} -le ${end_long} ]
do
    call_date=`date -d '1970-01-01 UTC '${begin_long}' seconds' +"%Y%m%d"`
	call_time=`date -d '1970-01-01 UTC '${begin_long}' seconds' +"%H%M"`
	getItemFromLSP $LOG_NAME ${call_date} ${call_time} $SAVE_FOLDER ${IS_OFFLINE} ${NEED_MD5}
	if [ $? -eq -1 ];then
		return -1
	fi
	begin_long=`expr ${begin_long} + ${add_time}`
done
#======get item each time:end=========
}

get_item "$@"
