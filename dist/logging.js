"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
function log(level, message, context = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
    };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
}
function logInfo(message, context = {}) {
    log('info', message, context);
}
function logWarn(message, context = {}) {
    log('warn', message, context);
}
function logError(message, context = {}) {
    log('error', message, context);
}
