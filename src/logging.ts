export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  sessionId?: string;
  provider?: string;
  model?: string;
  channel?: string;
  event?: string;
  [key: string]: unknown;
}

export function log(level: LogLevel, message: string, context: LogContext = {}): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  process.stderr.write(`${JSON.stringify(payload)}\n`);
}

export function logInfo(message: string, context: LogContext = {}): void {
  log('info', message, context);
}

export function logWarn(message: string, context: LogContext = {}): void {
  log('warn', message, context);
}

export function logError(message: string, context: LogContext = {}): void {
  log('error', message, context);
}