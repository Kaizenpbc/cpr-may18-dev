// Development-only logging utility
// These functions only log in development mode to prevent sensitive data leakage in production

const isDev = process.env.NODE_ENV !== 'production';

export const devLog = (...args: unknown[]): void => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]): void => {
  if (isDev) console.warn(...args);
};

export const devError = (...args: unknown[]): void => {
  if (isDev) console.error(...args);
};

export const devInfo = (...args: unknown[]): void => {
  if (isDev) console.info(...args);
};

// For debug logging with a prefix
export const devDebug = (prefix: string, ...args: unknown[]): void => {
  if (isDev) console.log(`[${prefix}]`, ...args);
};

export default { devLog, devWarn, devError, devInfo, devDebug };
