/**
 * Logger utility for 9Trip B2C
 * Only logs in development environment to prevent leaking info in production
 * 
 * @example
 * import { logger } from '@/lib/logger';
 * logger.log('Debug info:', data);
 * logger.warn('Warning message');
 * logger.error('Error occurred:', error);
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Development-only logger. Production builds will not output logs
 * (except errors which are always logged).
 */
export const logger = {
  /**
   * Log debug information (development only)
   * @param {...*} args - Arguments to log
   */
  log: (...args) => {
    if (isDev) {
      console.log('[9Trip]', ...args);
    }
  },

  /**
   * Log warnings (development only)
   * @param {...*} args - Arguments to warn
   */
  warn: (...args) => {
    if (isDev) {
      console.warn('[9Trip]', ...args);
    }
  },

  /**
   * Log errors (always, including production)
   * @param {...*} args - Arguments to error
   */
  error: (...args) => {
    console.error('[9Trip]', ...args);
  },

  /**
   * Log info (development only)
   * @param {...*} args - Arguments to info
   */
  info: (...args) => {
    if (isDev) {
      console.info('[9Trip]', ...args);
    }
  },
};

/**
 * Grouped logger for related logs (development only)
 * @param {string} label - Group label
 * @param {Function} fn - Function containing logs to group
 */
export const loggerGroup = (label, fn) => {
  if (isDev) {
    console.group(`[9Trip] ${label}`);
    fn();
    console.groupEnd();
  }
};
