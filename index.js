/**
 * @file 性能dashboard backend主文件，读入pipeline定义并执行pipeline。
 * @author hanbingfeng@baidu.com
 */

var u = require('underscore');

var argv = require('yargs')
    .usage('使用方法：$0 [选项]')
    .option('f', {
        demand: true,
        describe: 'pipeline定义文件',
        type: 'string'
    })
    .option('o', {
        describe: '一段encoded json，解析后作为当前pipeline的context使用。',
        type: 'string'
    })
    .example('', '$0 -f pipeline\/pipeline_basic_performance_plan_daily.json -o "{\\"autodelte\\":true}"')
    .argv;
try {
    var pipelineJson = JSON.parse(require('fs').readFileSync(argv.f, {encoding: 'utf8'}));
    if (argv.o != null) {
        u.each(JSON.parse(argv.o), function (value, key) {
            require('./lib/context').set(key, value);
        });
    }
    require('./lib/pipeline').execute(pipelineJson).fail(function (err) {
        console.error('pipeline execute error, ', err.stack);
        process.exit(-1);
    });
}
catch (ex) {
    console.error('root exception, ', ex.stack);
    process.exit(-1);
}

