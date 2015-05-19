#! /bin/sh

source `dirname $0`/run_env.sh

export PIPELINE_NAME=pipeline_basic_performance_nirvana.json
export LOG_NAME=fengchao_feview_performance_rawlog_speedup3_hourly
export DB_COLLECTION_NAME=performance_keywordii_basic_hourly
export TARGET_PATH=/manage/keyword

# 每小时取1小时前的数据
export START=`date -d "-1hour" +"%Y%m%d"`
export BEGIN=`date -d "-1hour" +"%H"`

call_get_item

