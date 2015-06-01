#! /bin/sh

source `dirname $0`/run_env.sh

export PIPELINE_NAME=pipeline_performance_keyword_file.json
export LOG_NAME=fengchao_feview_performance_nirvana_mod_day
export DB_COLLECTION_NAME=\{\"new\":\"performance_keyword_coreFunction\",\"old\":\"performance_keywordii_coreFunction\"\}
export TARGET_PATH=/manage/keyword

call_get_item

