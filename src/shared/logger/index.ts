import pino from 'pino';

const sensitiveKeys = ['password', 'senha', 'token', 'authorization', 'cookie', 'secret'];

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const keyLower = k.toLowerCase();
    if (sensitiveKeys.some((s) => keyLower.includes(s))) {
      out[k] = '[REDACTED]';
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = redact(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export type LogContext = {
  event?: string;
  domain?: string;
  code?: string;
  error?: string;
  durationMs?: number;
  [key: string]: unknown;
};

const DEV = import.meta.env.DEV;

function formatLogLine(logObj: Record<string, unknown>): void {
  const { level, msg, message, time, ...rest } = logObj;
  const levelNum = typeof level === 'number' ? level : 30;
  const levelLabel =
    levelNum >= 60 ? 'FATAL' : levelNum >= 50 ? 'ERROR' : levelNum >= 40 ? 'WARN' : levelNum >= 30 ? 'INFO' : 'DEBUG';
  const text = (msg ?? message ?? '') as string;
  const timeStr =
    typeof time === 'number'
      ? new Date(time).toISOString()
      : time != null
        ? String(time)
        : new Date().toISOString();
  const keys = Object.keys(rest).filter((k) => !['app', 'pid', 'hostname'].includes(k));
  const contextStr =
    keys.length === 0 ? '' : ' ' + keys.map((k) => `${k}=${JSON.stringify(rest[k])}`).join(' ');
  const line = `[${timeStr}] ${levelLabel} ${text}${contextStr}`;
  const method = levelNum >= 50 ? 'error' : levelNum >= 40 ? 'warn' : 'log';
  console[method](line);
}

const pinoOpts: pino.LoggerOptions = {
  level: DEV ? 'debug' : 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { app: 'FlowBudget' },
};

if (typeof window !== 'undefined' && DEV) {
  (pinoOpts as pino.LoggerOptions & { browser: { write: (o: object) => void } }).browser = {
    write: (logObj: object) => formatLogLine(logObj as Record<string, unknown>),
  };
}

const logger = pino(pinoOpts);

export function createAppLogger(context?: LogContext) {
  const safeContext = context ? redact(context) : {};
  const withContext = (ctx?: LogContext) => ({ ...safeContext, ...redact(ctx ?? {}) });

  return {
    debug: (message: string, ctx?: LogContext) =>
      logger.debug(withContext(ctx), message),
    info: (message: string, ctx?: LogContext) =>
      logger.info(withContext(ctx), message),
    warn: (message: string, ctx?: LogContext) =>
      logger.warn(withContext(ctx), message),
    error: (message: string, ctx?: LogContext) =>
      logger.error(withContext(ctx), message),
    child: (bindings: LogContext) => createAppLogger({ ...safeContext, ...bindings }),
  };
}

export const appLogger = createAppLogger();
