export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEvent {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}
