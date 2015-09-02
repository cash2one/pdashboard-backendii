#! /bin/sh

source `dirname $0`/../bin/run_env.sh

export PIPELINE_NAME=../test/pipeline_test.json
export LOG_NAME=fengchao_feview_performance_rawlog_speedup3_day
export DB_COLLECTION_NAME=performance_plan_basic

call_get_item
