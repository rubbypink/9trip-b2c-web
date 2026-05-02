/**
 * MoMo Payment Module — Real Integration.
 *
 * Sandbox: https://test-payment.momo.vn/v2/gateway/api/create
 * Production: https://payment.momo.vn/v2/gateway/api/create
 * Signature: HMAC SHA256 of sorted key=value pairs.
 */

import crypto from "crypto";

const MOMO_ENDPOINT = process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create";
const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE || "";
const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY || "";
const MOMO_SECRET_KEY = process.env.MOMO_SECRET_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com";
const CLOUD_FUNCTION_URL = process.env.CLOUD_FUNCTION_URL || "https://asia-southeast1-tripphuquoc-db-fs.cloudfunctions.net";

/**
 * Create a MoMo payment request and return the payment URL.
 * @param {Object} options
 * @param {string} options.bookingId - Unique booking ID (used as requestId + orderId)
 * @param {number} options.amount - Amount in VND
 * @param {string} options.bookingCode - Human-readable order info
 * @param {string} [options.orderInfo] - Additional order description
 * @returns {Promise<{ success: boolean, payUrl?: string, qrCodeUrl?: string, deeplink?: string, message?: string }>}
 */
export async function createMomoPayment({ bookingId, amount, bookingCode, orderInfo }) {
  const requestId = `${bookingId}_${Date.now()}`;
  const orderId = bookingId;
  const amountRounded = Math.round(amount);
  const info = orderInfo || `Thanh toan don hang ${bookingCode}`;

  const rawSignature = [
    `accessKey=${MOMO_ACCESS_KEY}`,
    `amount=${amountRounded}`,
    `extraData=`,
    `ipnUrl=${CLOUD_FUNCTION_URL}/paymentWebhook?gateway=momo`,
    `orderId=${orderId}`,
    `orderInfo=${info}`,
    `partnerCode=${MOMO_PARTNER_CODE}`,
    `redirectUrl=${SITE_URL}/booking/return?gateway=momo`,
    `requestId=${requestId}`,
    `requestType=captureWallet`,
  ].join("&");

  const signature = crypto.createHmac("sha256", MOMO_SECRET_KEY).update(rawSignature, "utf-8").digest("hex");

  const requestBody = {
    partnerCode: MOMO_PARTNER_CODE,
    accessKey: MOMO_ACCESS_KEY,
    requestId,
    amount: amountRounded,
    orderId,
    orderInfo: info,
    redirectUrl: `${SITE_URL}/booking/return?gateway=momo`,
    ipnUrl: `${CLOUD_FUNCTION_URL}/paymentWebhook?gateway=momo`,
    extraData: "",
    requestType: "captureWallet",
    signature,
    lang: "vi",
  };

  try {
    const response = await fetch(MOMO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();

    if (data.resultCode === 0) {
      return { success: true, payUrl: data.payUrl, qrCodeUrl: data.qrCodeUrl, deeplink: data.deeplink };
    }

    return { success: false, message: data.message || `MoMo error: resultCode=${data.resultCode}` };
  } catch (err) {
    console.error("[MoMo] API call failed:", err.message);
    return { success: false, message: `Không thể kết nối đến cổng thanh toán MoMo: ${err.message}` };
  }
}

/**
 * Verify MoMo IPN signature.
 * @param {Object} payload - MoMo IPN callback body
 * @returns {{ valid: boolean, isSuccess: boolean, bookingId: string|null, transactionId: string|null, amount: number|null }}
 */
export function verifyMomoIPN(payload) {
  const { signature, ...rest } = payload;
  const keys = Object.keys(rest).sort();
  const rawSignature = keys.map((k) => `${k}=${rest[k]}`).join("&");
  const computedSig = crypto.createHmac("sha256", MOMO_SECRET_KEY).update(rawSignature, "utf-8").digest("hex");

  return {
    valid: computedSig === signature,
    isSuccess: payload.resultCode === 0,
    bookingId: payload.orderId || null,
    transactionId: payload.transId || null,
    amount: payload.amount || null,
  };
}
