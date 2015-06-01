#! /bin/sh

source `dirname $0`/run_env.sh

export PIPELINE_NAME=pipeline_basic_performance_nirvana.json
export LOG_NAME=fengchao_feview_performance_rawlog_nirvana_keyword_day
export DB_COLLECTION_NAME=performance_keywordii_basic
export XLL="[\"xll/speedup3.keyword.1\"]"

call_get_item


