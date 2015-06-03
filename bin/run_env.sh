#! /bin/sh

HOME=/home/users/hanbingfeng/
JUMBO=$HOME/.jumbo
WORK_HOME=$HOME/src/pdashboard-backend
PATH=/bin:/usr/bin:$JUMBO/bin:$PATH

export DB_URL=mongodb://localhost:27017/pdashboard

export STDOUT_LOG=$HOME/pdashboard-stdout.log
export STDERR_LOG=$HOME/pdashboard-stderr.log


##
# 启动一个pipeline，下载log脚本，计算并存入数据库
# Globals:
#     PIPELINE_NAME pipeline脚本的名字，必须是存在于pipeline_scripts下的某个文件
#     LOG_NAME log平台上的名字
#     DB_URL 连接mongodb的url，默认为mongodb://localhost:27017/pdashboard
#     DB_COLLECTION_NAME mongodb上存放数据的collection名字
#     TARGET_PATH 需要过滤的targetPath
#     START 开始日期
#     BEGIN 开始小时，若出现，则认为是下载小时日志
##
function call_get_item {
    date >> ${STDOUT_LOG}
    date >> ${STDERR_LOG}

    get_item_args="[\"${LOG_NAME}\","

    if [[ ! -z "${START}" ]]; then
        get_item_args="${get_item_args}\"-s\",\"${START}\","
    fi

    if [[ ! -z "${BEGIN}" ]]; then
        get_item_args="${get_item_args}\"-b\",\"${BEGIN}\",\"-h\",\"3600\","
    fi

    if [[ -z "${XLL}" ]]; then
        XLL="[]"
    fi

    get_item_args="${get_item_args}\"-o\",\"-l\",\"logs/\"]"

    cd $WORK_HOME && \
        $JUMBO/bin/node index.js \
            -f pipeline_scripts/${PIPELINE_NAME} \
            -o "\
{\
\"getItemArgs\":${get_item_args},\
\"dbUrl\":\"${DB_URL}\",\
\"dbCollectionName\":\"${DB_COLLECTION_NAME}\",\
\"targetPath\":\"${TARGET_PATH}\",\
\"shouldCleanByRecordTimestamp\":true,\
\"xll\":${XLL}\
}\
"\
            >> ${STDOUT_LOG} 2>> ${STDERR_LOG} &
}


