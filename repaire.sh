#!/bin/bash

for i in 0{4..9}; do
    for j in `ls /var/nirvana/raw_live_logs/data_slice/201511${i}`; do
        ruby bin/adpreview_backend_request_stat.rb -t "2015-11-${i} ${j}:00:00" -p "/var/nirvana/raw_live_logs/data_slice";
    done
done
