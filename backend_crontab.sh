#! /bin/bash
source /home/work/.bashrc
node /home/work/.local/var/pdashboard-backend/bin/run.js >> /home/work/.local/var/pdashboard-backend/logs/pdashboard_out.log
yesterday=`date -d"yesterday" +"%Y-%m-%d"`
datapath="/var/nirvana/raw_live_logs/data"
ruby /home/word/.local/var/pdashboard-backend/bin/adpreview_backend_request_stat.rb -d ${yesterday} -p ${datapath} >> /home/work/.local/var/pdashboard-backend/logs/pdashboard_out.log
