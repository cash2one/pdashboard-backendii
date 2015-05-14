#! /bin/sh

source `dirname $0`/run_env.sh

export PIPELINE_NAME=pipeline_performance_emanage.json
export LOG_NAME=fengchao_feview_performance_easy_manage
export DB_COLLECTION_NAME=performance_emanage_basic

call_get_item

