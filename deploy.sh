#! bin/bash

##
# @file 项目部署文件
# @author wujianwei01@baidu.com
##
export CURRENT=`pwd`
# 设定hadoop-client工作目录，相对于用户目录
read -p  "请输入hadoop-client目录(绝对目录)：" HADOOP_CLIENT
export HADOOP_BIN=$HADOOP_CLIENT/hadoop/bin
if [ ! -d $HADOOP_BIN ]; then
    echo "hadoop-client目录不存在，请重新输入！"
    exit -1
fi

# 设定项目的工作目录，此时的WROK是相对于HOME的
read -p  "请输入工作目录（绝对目录）：" WORK_HOME

# 如果当前目录与工作目录不相同，则将当前目录中的文件复制到工作目录中并切换到工作目录下
if [ "$CURRENT"x != "$WORK_DIR"x ]; then
    cp -r $CURRENT/.  $WORK_HOME && cd $WORK_HOME
fi

# 设定mongodb地址
read -p "请输入mongodb的地址：" DB_URL

# 将hadoop运行环境添加到环境变量中
PATH=/bin:/usr/bin:$HADOOP_BIN:$PATH

# 下载的log数据存放的地址
export LOGS=$WORK_HOME/logs
if [ ! -d $LOGS ]; then
    mkdir $LOGS
fi
# 程序运行的错误和输出日志
export ERROR=$WORK_HOME/pdashboard-stderr.log
export OUT=$WORK_HOME/pdashboard-stdout.log
if [ ! -f $ERROR ]; then
    touch $ERROR
    touch $OUT
fi

# 将配置项存到pdashboard_conf.json文件中
cat >~/.pdashboard.conf <<EOF
##
# @file pdashboard-backend 项目的配置项
# @author wujianwei01@baidu.com
##

# hadoop-client目录
HADOOP_BIN=$HADOOP_BIN

# project所在目录
WORK_HOME=$WORK_HOME

# mongodb地址
DB_URL=$DB_URL

# log文件存放目录
DATA_HOME=$LOGS

# 程序运行错误日志文件路径
STDERR_LOG=$ERROR

# 程序运行输出日志文件路径
STDOUT_LOG=$OUT
EOF

exit 0
