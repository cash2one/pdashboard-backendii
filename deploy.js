/**
 * @file 项目部署文件
 * @author wujianwei01@baidu.com
 * 
 */

var prompt = require('prompt');
var fs = require('fs-extra');
var _ = require('underscore');
var cp = require('child_process');

// 文件夹不存在时的提示语
var dirNotExistMsg = '文件夹不存在，请重新输入';

/**
 * 判断文件夹是否存在
 * @param {string} dirname 文件夹名
 * @return {boolean} true|false 存在返回true,否则false
 *
 */
function isDirExist (dirname) {
    return !fs.existsSync(dirname) ? false : true;
}
var schema = {
    properties: {
        'hadoop-bin': {
            require: true,
            description: '请输入hadoop-bin目录绝对路径',
            message: dirNotExistMsg,
            conform: isDirExist
        },
        'log-cluster': {
            require: true,
            description: '请输入日志文件所在的集群路径'
        },
        'lsp-path': {
            require: true,
            description: '请输入集群中lsp路径'
        },
        'work-home': {
            require: true,
            description: '请输入项目工作目录所在的绝对路径',
            message: dirNotExistMsg,
            conform: isDirExist
        },
        'db-url': {
            require: true,
            description: '请输入后端mongodb地址'
        },
        'data-path': {
            require: true,
            description: '请输入下载完成后的文件存放目录'
        },
        'log-path': {
            require: true,
            description: '请输入项目工作日志存放目录'
        }
    }
};

var watchingList = {
    'watching-list': [
        {
            "name": "fengchao_feview_performance_jsonlog_nirvanaII_json_daily",
            "period": "daily",
            "collection": []
        },
        {
            "name": "fengchao_feview_performance_jsonlog_nirvana_json_daily",
            "period": "daily",
            "collection": []
        },
        {
            "name": "fengchao_feview_performance_jsonlog_nirvanaII_json_hourly",
            "period": "hourly",
            "collection": []
        },
        {
            "name": "fengchao_feview_performance_jsonlog_nirvana_json_hourly",
            "period": "hourly",
            "collection": []
        }
    ]
};
prompt.start();

prompt.get(schema, function (err, result) {
    if (err) {
        console.log(err);
    }
    else {
        result['data-path'] = result['work-home'] + '/' + result['data-path'];
        result['log-path'] = result['work-home'] + '/' + result['log-path'];
        var conf = process.env.HOME + '/.nightingale.conf';
        if (!fs.existsSync(conf)) {
            console.log('创建项目conf文件');
            fs.writeFileSync(conf, JSON.stringify(_.extend(result, watchingList), null, 4), 'utf-8');
        }
        if (result['work-home'] !== process.env.PWD) {
            var copyFile = cp.exec('cp -r ' + process.env.PWD + '/*  ' + result['work-home']);
            copyFile.on('close', function (code) {
                console.log('项目文件已部署到设定的工作目录. code:', code);
            });
        }
    }
});
