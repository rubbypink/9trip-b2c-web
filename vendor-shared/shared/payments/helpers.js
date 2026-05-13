import crypto from 'crypto';

/**
 * Sort an object's keys alphabetically (used for VNPay param signing).
 * @param {Record<string, string>} obj
 * @returns {Record<string, string>}
 */
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }
  return sorted;
}

/**
 * Generate an HMAC digest (supports SHA512 for VNPay and SHA256 for MoMo).
 * @param {string} data
 * @param {string} secretKey
 * @param {'sha512'|'sha256'} algorithm
 * @returns {string}
 */
function generateHmac(data, secretKey, algorithm = 'sha512') {
  const hmac = crypto.createHmac(algorithm, secretKey);
  return hmac.update(Buffer.from(data, 'utf-8')).digest('hex');
}

/**
 * Format a Date to yyyyMMddHHmmss (VNPay standard).
 * @param {Date} date
 * @returns {string}
 */
function formatVNPayDate(date) {
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export const PaymentHelper = { sortObject, generateHmac, formatVNPayDate };
