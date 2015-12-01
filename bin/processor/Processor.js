/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file Processor basic class of processor
 * @author Pride Leong<lykling.lyk@gmail.com>
 */
/* eslint-env node */

var events = require('events');
var util = require('util');
var _ = require('underscore');

/**
 * Processor 类, 所有的processor都继承该类
 * Processor继承EventEmitter
 * 每个类都有三个方法，start、handler、finish
 * start接收数据流，若为根则是读取log日志
 * handler监听line事件
 * finish监听exit事件
 * @param {Object} options 包含start、handler和finish方法
 */
function Processor(options) {
    events.EventEmitter.apply(this, arguments);
    this.setMaxListeners(20);
    options = options || {};
    this.handler = options.handler || _.noop;
    this.finish = options.finish || _.noop;
    if (_.isFunction(options.start)) {
        this.start = options.start;
    }
    if (_.isFunction(options.done)) {
        this.done = options.done;
    }
}
util.inherits(Processor, events.EventEmitter);

Processor.prototype.start = function (options) {
    this.initOptions(options);
};
Processor.prototype.done = function () {
    this.emit('end', {
        processor: this,
        data: {}
    });
};
Processor.prototype.initOptions = function (options) {
    if (options.context) {
        this.setContext(options.context);
    }
};
Processor.prototype.getContext = function (context) {
    if (this.context) {
        return this.context;
    }
    this.context = {};
    return this.context;
};
Processor.prototype.setContext = function (context) {
    this.context = context;
};

/**
 * Replace docs in collection which contain the same recordTimestamp
 *
 * @param {MongoClient} db mongodb connection instance
 * @param {string} collection collection name
 * @param {Array.<Object>} docs document to be updated
 *
 * @return {Promise}
 */
function replaceDocs(db, collection, docs) {
    var defer = Promise.defer();
    var coll = db.collection(collection);
    var timestamps = _.pluck(docs, 'recordTimestamp');
    coll.remove({recordTimestamp: {$in: timestamps}}, function (err, result) {
        if (err) {
            defer.reject(err);
        }
        else {
            console.info('[info]', 'updating collection:', collection);
            coll.insert(docs, function (err, result) {
                if (err) {
                    defer.reject(err);
                }
                defer.resolve(result);
            });
        }
    });
    return defer.promise;
}

/**
 * update db logs
 *
 * @param {db} db mongodb connection instance
 * @param {string} collection collection name
 * @param {Array.<Object>} docs documents to be updated
 * @param {Object} opts options of updating
 *
 * @return {Promise}
 */
Processor.prototype.updateLogs = function (db, collection, docs, opts) {
    if (docs.length > 500) {
        return Promise.all([
            this.updateLogs(db, collection, _.head(docs, 500), opts),
            this.updateLogs(db, collection, _.rest(docs, 500), opts)
        ]);
    }
    opts = opts || {};
    var coll = db.collection(collection);
    var defer = Promise.defer();
    var timestamps = _.pluck(docs, 'recordTimestamp');
    if (opts.merge) {

        coll.find({recordTimestamp: {$in: timestamps}}).toArray(function (err, result) {
            if (err) {
                defer.reject(err);
            }
            var mergedDocs = _.map(docs, function (doc, idx) {
                return _.extend(
                    {},
                    _.detect(result, _.matches({recordTimestamp: doc.recordTimestamp})),
                    doc
                );
            });
            replaceDocs(db, collection, mergedDocs).then(defer.resolve, defer.reject);
        });
    }
    else {
        replaceDocs(db, collection, docs).then(defer.resolve, defer.reject);
    }
    return defer.promise;
};

module.exports = Processor;
