/**
 * Centralized error handling utilities.
 * Phân biệt expected errors (empty results, missing optional data)
 * với unexpected errors (network failure, auth issues).
 */
import { logger } from "./logger";

/** @type {string[]} Error messages that should NOT be logged as errors */
const EXPECTED_PATTERNS = [
  "No document to update",
  "Missing or insufficient permissions",
  "not-found",
];

/**
 * Check if an error is expected (not a real error).
 * Examples: no results in search, missing optional settings, permission denied on read.
 * @param {Error|string} error
 * @returns {boolean}
 */
export function isExpectedError(error) {
  const message = typeof error === "string" ? error : error?.message || "";
  return EXPECTED_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Safe console.error — only logs unexpected errors.
 * @param {string} context — where the error happened (e.g., "[searchTours]")
 * @param {Error|string} error
 */
export function logError(context, error) {
  if (isExpectedError(error)) {
    // Expected — log as info, not error
    logger.info(`${context} (expected):`, typeof error === "string" ? error : error?.message);
  } else {
    logger.error(`${context}:`, error);
  }
}

/**
 * Wrap a function to add error handling that returns a fallback on failure.
 * @param {Function} fn — async function to wrap
 * @param {*} fallback — value to return on error
 * @param {string} context — log context name
 * @returns {Function}
 */
export function withErrorFallback(fn, fallback, context = "") {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(context, error);
      return typeof fallback === "function" ? fallback(...args) : fallback;
    }
  };
}

/**
 * Safe JSON parse — returns fallback on parse error instead of throwing.
 * @param {string} str
 * @param {*} [fallback=null]
 * @returns {*}
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Get safe fallback image URL with a placeholder.
 * @param {string|null|undefined} url
 * @param {string} type — 'tour' | 'hotel' | 'activity' | 'car' | 'rental' | 'avatar'
 * @returns {string}
 */
export function getSafeImage(url, type = "tour") {
  if (url && url.startsWith("http")) return url;
  return `/placeholder-${type}.jpg`;
}
