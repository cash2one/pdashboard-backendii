#! /bin/sh

source `dirname $0`/run_env.sh

export PIPELINE_NAME=pipeline_performance_keyword_file.json
export LOG_NAME=fengchao_feview_performance_nirvana_mod_day
export DB_COLLECTION_NAME={\"new\":\"performance_keyword_coreFunction\",\"old\":\"performance_keywordii_coreFunction\"}
export TARGET_PATH=/manage/keyword

export DB_URL=performance_GET_data
export WORK_HOME=/home/users/gushouchuang/backend/pdashboard-backend
export STDOUT_LOG=/home/users/gushouchuang/backend/edp-stdout.log
export STDERR_LOG=/home/users/gushouchuang/backend/edp-stderr.log

call_get_item

