/**
 * Payment Utilities — Shared helpers across all payment modules.
 */

/**
 * Retry an async function with exponential backoff.
 * @param {Function} fn - Async function to retry
 * @param {{ maxRetries?: number, baseDelayMs?: number, timeoutMs?: number }} [options]
 * @returns {Promise<any>}
 */
export async function withRetry(fn, { maxRetries = 3, baseDelayMs = 1000, timeoutMs = 30000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const result = await fn({ signal: controller.signal });
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err.message);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Log a payment event to the server for debugging.
 * @param {Object} event
 * @param {string} event.gateway
 * @param {string} event.bookingId
 * @param {string} event.event - 'create' | 'ipn' | 'return' | 'capture' | 'error'
 * @param {Object} [event.request]
 * @param {Object} [event.response]
 * @param {string} [event.error]
 */
export function logPaymentEvent({ gateway, bookingId, event, request, response, error }) {
  const logEntry = {
    gateway,
    bookingId,
    event,
    request: request ? JSON.stringify(request) : null,
    response: response ? JSON.stringify(response) : null,
    error: error || null,
    timestamp: new Date().toISOString(),
    duration: 0,
  };

  // Fire-and-forget to avoid blocking the main flow
  fetch("/api/payments/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logEntry),
  }).catch((e) => console.warn("[PaymentLog] Failed to send log:", e.message));

  if (error) {
    console.error(`[Payment:${gateway}:${event}] ERROR:`, error, logEntry);
  } else {
    console.log(`[Payment:${gateway}:${event}]`, logEntry);
  }
}
