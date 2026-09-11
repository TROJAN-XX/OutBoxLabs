type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, ...args: unknown[]): string {
  const timestamp = formatTimestamp();
  const prefix = `${timestamp} [${level.toUpperCase()}]`;
  const message = args
    .map((arg) => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === 'object') return JSON.stringify(arg);
      return String(arg);
    })
    .join(' ');
  return `${prefix} ${message}`;
}

export const logger = {
  info: (...args: unknown[]): void => {
    console.log(formatMessage('info', ...args));
  },
  warn: (...args: unknown[]): void => {
    console.warn(formatMessage('warn', ...args));
  },
  error: (...args: unknown[]): void => {
    console.error(formatMessage('error', ...args));
  },
  debug: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', ...args));
    }
  },
};
