/**
 * Copyright (C) 2015 All rights reserved.
 *
 * @file maps.js
 * @author Huang Jinsheng<huangjinsheng@baidu.com>
 */
/* eslint-env node */

module.exports = {
    // 前端性能相关的(log)任务处理
    performance: {
        logReader: {
            up: [],
            down: [
                'planDataProcessor',
                'keywordDataProcessor',
                'timelineDataProcessor',
                'emanageDataProcessor'
            ]
        },
        planDataProcessor: {
            up: ['logReader'],
            down: []
        },
        keywordDataProcessor: {
            up: ['logReader'],
            down: []
        },
        timelineDataProcessor: {
            up: ['logReader'],
            down: []
        },
        emanageDataProcessor: {
            up: ['logReader'],
            down: []
        }
    },

    // 推广实况相关log任务处理
    adpreview: {
        adprviewLogReader: {
            up: [],
            down: [
                'adpreviewPVDataProcessor',
                'adpreviewUVDataProcessor',
                'adpreviewFcApiDataProcessor',
                'adpreviewBannedDataProcessor'
            ]
        },
        adpreviewPVDataProcessor: {
            up: ['adprviewLogReader'],
            down: []
        },
        adpreviewUVDataProcessor: {
            up: ['adprviewLogReader'],
            down: []
        },
        adpreviewFcApiDataProcessor: {
            up: ['adprviewLogReader'],
            down: []
        },
        adpreviewBannedDataProcessor: {
            up: ['adprviewLogReader'],
            down: []
        }
    }
};