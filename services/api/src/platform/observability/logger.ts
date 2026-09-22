export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly service: string;
  readonly correlationId?: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly requestId?: string;
  readonly timestamp: string;
  readonly [key: string]: unknown;
}

export interface Logger {
  trace: (message: string, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  child: (labels: Record<string, unknown>) => Logger;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 };

function jsonLine(service: string, level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    message,
    service,
    timestamp: new Date().toISOString(),
    ...context,
  };
  return JSON.stringify(entry);
}

function toConsole(level: LogLevel): (...args: unknown[]) => void {
  if (level === 'error') return console.error;
  if (level === 'warn') return console.warn;
  return console.info;
}

/** Structured JSON logger. Never use bare console.log for operational logs. */
export function createLogger(service: string, minLevel: LogLevel = 'info'): Logger {
  const record = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;
    toConsole(level)(jsonLine(service, level, message, context));
  };

  return {
    trace: (message, context) => record('trace', message, context),
    debug: (message, context) => record('debug', message, context),
    info: (message, context) => record('info', message, context),
    warn: (message, context) => record('warn', message, context),
    error: (message, context) => record('error', message, context),
    child: (_labels) =>
      createLogger(service, minLevel),
  };
}