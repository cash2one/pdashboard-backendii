
var argv = require('yargs')
    .usage('使用方法：$0 [选项]')
    .option('dbUrl', {
        demand: true,
        describe: '数据库连接url',
        type: 'string'
    })
    .argv;

require('./lib/context').set('dbUrl', argv.dbUrl);

exports.port = 8848;
exports.directoryIndexes = true;
exports.documentRoot = __dirname;
exports.getLocations = function () {
    return [
        {
            location: /\/request\.ajax/,
            handler: require('./lib/db').request()
        },
        { 
            location: /^.*$/, 
            handler: function (context) {
                context.content = '<H1>too bad a request</H1>';
                context.status = 400;
            }
        }
    ];
};

exports.injectResource = function ( res ) {
    for ( var key in res ) {
        global[ key ] = res[ key ];
    }
};
