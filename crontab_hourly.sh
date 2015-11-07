#!/bin/bash
source $HOME/.bashrc
WORKING_DIR=${HOME}/.local/var/pdashboard-backend
node ${HOME}/.local/var/pdashboard-backend/bin/run_hourly.js >> ${WORKING_DIR}/logs/pdashboard_out.log
lasthour=`date -d"-1 hours" +"%Y-%m-%d %H:00:00"`
datapath="/var/nirvana/raw_live_logs/data_slice"
ruby ${WORKKING_DIR}/bin/adpreview_backend_request_stat.rb -t "${lasthour}" -p ${datapath} >> ${WORKING_DIR}/logs/pdashboard_out.log
echo "${lasthour}"
