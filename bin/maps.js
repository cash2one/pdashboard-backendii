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
        adpreviewLogReader: {
            up: [],
            down: [
                'adpreviewPVDataProcessor',
                'adpreviewUVDataProcessor',
                'adpreviewFcApiDataProcessor',
                'adpreviewBannedDataProcessor'
            ]
        },
        adpreviewPVDataProcessor: {
            up: ['adpreviewLogReader'],
            down: []
        },
        adpreviewUVDataProcessor: {
            up: ['adpreviewLogReader'],
            down: []
        },
        adpreviewFcApiDataProcessor: {
            up: ['adpreviewLogReader'],
            down: []
        },
        adpreviewBannedDataProcessor: {
            up: ['adpreviewLogReader'],
            down: []
        }
    },
    kr: {
        krLogReader: {
            up: [],
            down: [
                'krFePvProcess',
                'krMachinePvProcess'
            ]
        },
        krFePvProcess: {
            up: ['krLogReader'],
            down: ['krFePvProcess']
        },
        krMachinePvProcess: {
            up: ['krLogReader'],
            down: ['krMachinePvProcess']
        }
    }
};