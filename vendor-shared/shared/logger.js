/**
 * Logger utility for 9Trip
 * Logs at configured level in all environments. Default: "info" shows
 * error/warn/info in production, "debug" includes log/debug. Set
 * LOG_LEVEL=silent to disable all non-error output.
 *
 * @example
 * import { logger } from '@9trip/shared/logger';
 * logger.log('Debug info:', data);
 * logger.warn('Warning message');
 * logger.error('Error occurred:', error);
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, log: 3, debug: 4 };

const configuredLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info')).toLowerCase();
const currentLevel = LOG_LEVELS[configuredLevel] !== undefined ? LOG_LEVELS[configuredLevel] : LOG_LEVELS.info;

function shouldLog(level) {
  const levelNum = LOG_LEVELS[level];
  return levelNum !== undefined && levelNum <= currentLevel;
}

export const logger = {
  debug: (...args) => {
    if (shouldLog('debug')) console.debug('[9Trip]', ...args);
  },

  log: (...args) => {
    if (shouldLog('log')) console.log('[9Trip]', ...args);
  },

  info: (...args) => {
    if (shouldLog('info')) console.info('[9Trip]', ...args);
  },

  warn: (...args) => {
    if (shouldLog('warn')) console.warn('[9Trip]', ...args);
  },

  /**
   * Errors are always logged regardless of LOG_LEVEL.
   */
  error: (...args) => {
    console.error('[9Trip]', ...args);
  },
};

export const loggerGroup = (label, fn) => {
  if (shouldLog('log')) {
    console.group(`[9Trip] ${label}`);
    fn();
    console.groupEnd();
  }
};
