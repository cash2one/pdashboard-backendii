#! /bin/sh

source `dirname $0`/run_env.sh

export PIPELINE_NAME=pipeline_performance_keyword_file.json
export LOG_NAME=fengchao_feview_performance_nirvana_mod_day
export DB_COLLECTION_NAME="[\"performance_keyword_coreFunction\",\"performance_keywordii_coreFunction\"]"
call_get_item

