#! /bin/sh

##
# @file 项目部署
# @author wujianwei01@baidu.com
# 依赖的软件
# 1. jumbo
# 2. nodejs
# 3. hadoop-client
# 4. mongodb
#
##

HOME=/home/users/$USERNAME
JUMBO=$HOME/.jumbo
WORK_HOME=$HOME/$PDASH_ROOT/pdashboard-backend
HADOOP_CLIENT_BIN=$HOME/$HADOOP_ROOT/hadoop-client/hadoop/bin
PATH=/bin:/usr/bin:$JUMBO/bin:$HADOOP_CLIENT_BIN:$PATH

export DB_URL=mongodb://localhost:27017/pdashboard

export LOG_DIR=$HOME/$DATA_ROOT/logs
export STDOUT_LOG=$HOME/$DATA_ROOT/pdashboard-stdout.log
export STDERR_LOG=$HOME/$DATA_ROOT/pdashboard-stderr.log
