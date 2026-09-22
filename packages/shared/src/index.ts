export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  readonly correlationId?: string;
  readonly userId?: string;
  readonly requestId?: string;
  readonly [key: string]: unknown;
}

export interface Logger {
  trace: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (labels: LogContext) => Logger;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 };

const CONSOLE: Record<Exclude<LogLevel, 'trace' | 'debug'>, (...args: unknown[]) => void> = {
  info: console.info,
  warn: console.warn,
  error: console.error,
};

/** Minimal structured logger shared across worker and services (no external deps). */
export function createLogger(serviceName: string, minLevel: LogLevel = 'info'): Logger {
  const record = (level: LogLevel, message: string, context?: LogContext): void => {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;
    const output = (CONSOLE[level as Exclude<LogLevel, 'trace' | 'debug'>] ?? console.info);
    output(JSON.stringify({ service: serviceName, level, message, time: new Date().toISOString(), ...context }));
  };

  return {
    trace: (message, context) => record('trace', message, context),
    debug: (message, context) => record('debug', message, context),
    info: (message, context) => record('info', message, context),
    warn: (message, context) => record('warn', message, context),
    error: (message, context) => record('error', message, context),
    child: () => createLogger(serviceName, minLevel),
  };
}