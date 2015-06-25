#! /bin/sh

source `dirname $0`/run_env.sh

export PIPELINE_NAME=pipeline_basic_performance_nirvana.json
export LOG_NAME=fengchao_feview_performance_rawlog_speedup3_day
export DB_COLLECTION_NAME=performance_keywordii_basic
export TARGET_PATH=/manage/keyword
export XLL="[\"xll/speedup3.keyword.1\",\"xll/speedup3.keyword.2\",\"xll/speedup3.keyword.3\"]"

call_get_item

