/**
 * @author Han Bing Feng
 */

var cp = require('child_process');

exports.start = function () {
    var ret = cp.exec(['sh', 'get_item.sh']
            .concat(Array.prototype.slice.call(arguments))
            .join(' '),
            {
                cwd: require('path').resolve(__dirname, '..')
            },
            function (error, stdout, stderr) {
                console.error(error);
                console.log(stdout.toString());
            }
    );
};

if (process.argv[1] === __filename) {
    console.log(__dirname);
    exports.start.apply(null, process.argv.slice(2));
}

