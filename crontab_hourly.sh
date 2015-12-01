#!/bin/bash
source $HOME/.bashrc
WORKING_DIR=${HOME}/.local/var/pdashboard-backend
node ${HOME}/.local/var/pdashboard-backend/bin/run.js -t >> ${WORKING_DIR}/logs/pdashboard_out_hourly.log 2>&1
lasthour=`date -d"-1 hours" +"%Y-%m-%d %H:00:00"`
datapath="/var/nirvana/raw_live_logs/data_slice"
ruby ${WORKING_DIR}/bin/adpreview_backend_request_stat.rb -t "${lasthour}" -p ${datapath} >> ${WORKING_DIR}/logs/pdashboard_out_hourly.log 2>&1
echo "${lasthour}"
