/**
 * Winston日志服务
 * 提供结构化日志记录、日志轮转、多级别日志等功能
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 日志目录
const logDir = path.join(__dirname, '../../logs');

// 定义日志格式
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// 控制台输出格式（带颜色）
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// 创建日志传输器
const transports = [
    // 控制台输出
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
    }),

    // 错误日志文件（每天轮转）
    new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d', // 保留14天
        format: logFormat
    }),

    // 应用日志文件（每天轮转）
    new DailyRotateFile({
        filename: path.join(logDir, 'app-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d', // 保留30天
        format: logFormat
    }),

    // API访问日志（单独文件）
    new DailyRotateFile({
        filename: path.join(logDir, 'api-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        maxSize: '20m',
        maxFiles: '7d', // 保留7天
        format: logFormat
    })
];

// 创建Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports,
    exitOnError: false
});

// 创建API请求日志中间件
const apiLogger = (req, res, next) => {
    const startTime = Date.now();

    // 记录请求
    logger.http('API Request', {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
    });

    // 监听响应完成事件
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const { statusCode } = res;

        // 记录响应
        logger.http('API Response', {
            method: req.method,
            url: req.url,
            statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        });

        // 慢请求告警（超过1秒）
        if (duration > 1000) {
            logger.warn('Slow API Request', {
                method: req.method,
                url: req.url,
                duration: `${duration}ms`
            });
        }

        // 错误响应记录
        if (statusCode >= 400) {
            logger.error('API Error', {
                method: req.method,
                url: req.url,
                statusCode,
                duration: `${duration}ms`
            });
        }
    });

    next();
};

// 创建错误处理中间件
const errorLogger = (err, req, res, next) => {
    logger.error('Unhandled Error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
    });

    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: '服务器内部错误'
        }
    });
};

// 性能监控工具
const performanceLogger = {
    // 记录数据库查询性能
    logQuery: (query, duration) => {
        if (duration > 100) {
            logger.warn('Slow Database Query', {
                query: query.substring(0, 100),
                duration: `${duration}ms`
            });
        }
    },

    // 记录外部API调用性能
    logExternalAPI: (api, duration) => {
        logger.info('External API Call', {
            api,
            duration: `${duration}ms`,
            status: duration < 2000 ? 'success' : 'slow'
        });
    },

    // 记录缓存性能
    logCache: (operation, hit, duration) => {
        logger.http('Cache Operation', {
            operation,
            hit,
            duration: `${duration}ms`
        });
    }
};

// 业务日志记录器
const businessLogger = {
    // 用户行为日志
    logUserAction: (userId, action, details) => {
        logger.info('User Action', {
            userId,
            action,
            ...details
        });
    },

    // 匹配分数计算日志
    logMatchCalculation: (userAId, userBId, score, algorithm, cached) => {
        logger.info('Match Calculation', {
            userAId,
            userBId,
            score,
            algorithm,
            cached
        });
    },

    // AI API调用日志
    logAICall: (provider, model, tokens, duration) => {
        logger.info('AI API Call', {
            provider,
            model,
            tokens,
            duration: `${duration}ms`
        });
    },

    // WebSocket连接日志
    logWebSocketConnection: (userId, event) => {
        logger.http('WebSocket Event', {
            userId,
            event,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    logger,
    apiLogger,
    errorLogger,
    performanceLogger,
    businessLogger
};
