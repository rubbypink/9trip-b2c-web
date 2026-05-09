/**
 * MoMo Payment Creation — Cloud Function wrapper.
 *
 * This Cloud Function handles the MoMo API call because MoMo requires
 * a minimum 30s timeout, which exceeds Vercel Hobby's 10s limit.
 *
 * Called by: Next.js API route /api/payments/momo/create (proxy)
 */

import crypto from "node:crypto";

const MOMO_ENDPOINT = process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create";
const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE || "";
const MOMO_ACCESS_KEY = process.env.MOMO_ACCESS_KEY || "";
const MOMO_SECRET_KEY = process.env.MOMO_SECRET_KEY || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com";
const CLOUD_FUNCTION_URL = process.env.CLOUD_FUNCTION_URL || "";

/**
 * Create a MoMo payment request via MoMo API.
 * @param {Object} params
 * @param {string} params.bookingId - Unique booking ID
 * @param {number} params.amount - Amount in VND
 * @param {string} params.bookingCode - Human-readable order info
 * @param {string} [params.orderInfo] - Additional description
 * @returns {Promise<{ success: boolean, payUrl?: string, qrCodeUrl?: string, deeplink?: string, message?: string }>}
 */
async function createMomoPayment({ bookingId, amount, bookingCode, orderInfo }) {
  const requestId = `${bookingId}_${Date.now()}`;
  const orderId = bookingId;
  const amountRounded = Math.round(amount);
  const info = orderInfo || `Thanh toan don hang ${bookingCode}`;

  // Build signature string (keys sorted alphabetically)
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

  const signature = crypto.createHmac("sha256", MOMO_SECRET_KEY)
    .update(rawSignature, "utf-8")
    .digest("hex");

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

  console.log("[MoMo CF] Creating payment:", { orderId, amount: amountRounded });

  const response = await fetch(MOMO_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json();

  if (data.resultCode === 0) {
    console.log("[MoMo CF] Payment created successfully:", { orderId, payUrl: data.payUrl });
    return { success: true, payUrl: data.payUrl, qrCodeUrl: data.qrCodeUrl, deeplink: data.deeplink };
  }

  console.warn("[MoMo CF] Payment creation failed:", { orderId, resultCode: data.resultCode, message: data.message });
  return { success: false, message: data.message || `MoMo error: resultCode=${data.resultCode}` };
}

export { createMomoPayment };
