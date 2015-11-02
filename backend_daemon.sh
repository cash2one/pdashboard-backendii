#!/bin/bash

##
# @file 后台服务守护进程
# @author wujianwei01@baidu.com
#
##

# 检查当前目录中是否存在edp-webserver-config.js文件
test -f ./edp-webserver-config.js || exit 0

# 执行的命令
CMD="nohup edp webserver start --port 18848 --dbUrl  mongodb://localhost:27017/pdashboard"

# pid存放文件
PID=.pdashboard-backend.pid

# 运行日志存放文件
LOG=~/.pdashboard-backend-daemon.log

# 启动
function start {
    $CMD  >> $LOG 2>&1 &
    myPid=$!
    echo $myPid > $PID
    echo "service start"
}

# 停止
function stop {
    kill `cat $PID`
    rm $PID
    echo "service stop"
}

case "$1" in
start)
    start
    ;;
stop)
    stop
    exit 0
    ;;
restart)
    if [ -f $PID ]; then
        stop
        sleep 3
    fi
    start
    ;;
*)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
esac
