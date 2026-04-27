/**
 * VNPay Payment Module — Real Integration.
 *
 * VNPay Sandbox:
 *   - URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
 *   - Test cards: https://sandbox.vnpayment.vn/apis/vnpay-demo/
 *
 * Signature: HMAC SHA512 of all request params (sorted by key), excluding vnp_SecureHash.
 */

import crypto from "crypto";

const VNPAY_URL = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE || "";
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com";

/**
 * Sort object keys alphabetically.
 * @param {Object} obj
 * @returns {Object}
 */
function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => { sorted[key] = obj[key]; });
  return sorted;
}

/**
 * Build URL-encoded query string from object.
 * @param {Object} params
 * @returns {string}
 */
function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

/**
 * Compute VNPay secure hash (HMAC SHA512).
 * All params sorted by key, concatenated as query string, then signed.
 * @param {Object} params - All params EXCEPT vnp_SecureHash
 * @param {string} [secret]
 * @returns {string} Hex-encoded HMAC SHA512 hash
 */
export function computeVNPayHash(params, secret = VNPAY_HASH_SECRET) {
  const sorted = sortObject(params);
  const query = buildQueryString(sorted);
  return crypto.createHmac("sha512", secret).update(Buffer.from(query, "utf-8")).digest("hex").toUpperCase();
}

/**
 * Build a VNPay payment URL for redirecting the customer.
 * @param {Object} options
 * @param {string} options.bookingId - Booking document ID (used as vnp_TxnRef)
 * @param {number} options.amount - Amount in VND
 * @param {string} options.bookingCode - Human-readable booking code (vnp_OrderInfo)
 * @param {string} [options.ipAddr] - Client IP address
 * @param {string} [options.locale] - "vn" or "en"
 * @param {string} [options.bankCode] - Optional bank code
 * @returns {string} Full VNPay payment URL
 */
export function buildVNPayUrl({ bookingId, amount, bookingCode, ipAddr = "127.0.0.1", locale = "vn", bankCode }) {
  const createDate = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const vnpAmount = Math.round(amount) * 100;

  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Amount: vnpAmount,
    vnp_CurrCode: "VND",
    vnp_TxnRef: bookingId,
    vnp_OrderInfo: bookingCode,
    vnp_OrderType: "other",
    vnp_Locale: locale,
    vnp_ReturnUrl: `${SITE_URL}/booking/return?gateway=vnpay`,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode) params.vnp_BankCode = bankCode;

  const secureHash = computeVNPayHash(params);
  params.vnp_SecureHash = secureHash;

  return `${VNPAY_URL}?${buildQueryString(params)}`;
}

/**
 * Verify VNPay IPN callback signature.
 * @param {Object} queryParams - All query parameters from VNPay callback
 * @returns {{ valid: boolean, isSuccess: boolean, bookingId: string|null, transactionId: string|null, amount: number|null, message: string }}
 */
export function verifyVNPayIPN(queryParams) {
  const receivedHash = queryParams.vnp_SecureHash;
  const paramsToHash = {};
  for (const [key, val] of Object.entries(queryParams)) {
    if (key !== "vnp_SecureHash" && key !== "vnp_SecureHashType") {
      paramsToHash[key] = val;
    }
  }

  const computedHash = computeVNPayHash(paramsToHash);
  if (computedHash !== receivedHash) {
    return { valid: false, isSuccess: false, bookingId: null, transactionId: null, amount: null, message: "Invalid signature" };
  }

  const responseCode = queryParams.vnp_ResponseCode;
  return {
    valid: true,
    isSuccess: responseCode === "00",
    bookingId: queryParams.vnp_TxnRef || null,
    transactionId: queryParams.vnp_TransactionNo || null,
    amount: queryParams.vnp_Amount ? Number(queryParams.vnp_Amount) / 100 : null,
    message: responseCode === "00" ? "Payment successful" : `Payment failed with code: ${responseCode}`,
  };
}

/**
 * Get the return URL that VNPay will redirect to after payment.
 * @returns {string}
 */
export function getVNPayReturnUrl() {
  return `${SITE_URL}/booking/return?gateway=vnpay`;
}
