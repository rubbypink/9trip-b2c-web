/**
 * Payment Utilities — Payload normalization and webhook signature verification.
 * Centralizes multi-gateway payment handling logic.
 */

import { computeVNPayHash, verifyVNPayIPN } from "./vnpay";
import { verifyMomoIPN } from "./momo";

/**
 * Normalize payment notification payloads from various gateways.
 * @param {string} gateway - 'vnpay' | 'momo' | 'paypal'
 * @param {Object} rawData - Original payload from gateway
 * @returns {Object|null} Normalized notification data
 */
export function normalizePaymentPayload(gateway, rawData) {
  switch (gateway) {
    case "vnpay":
      return {
        bookingId: rawData.vnp_TxnRef,
        transactionId: rawData.vnp_TransactionNo,
        status: rawData.vnp_ResponseCode === "00" ? "paid" : "failed",
        amount: rawData.vnp_Amount ? Number(rawData.vnp_Amount) / 100 : null,
        currency: "VND",
        rawData,
      };
    case "momo":
      return {
        bookingId: rawData.orderId,
        transactionId: rawData.transId,
        status: rawData.resultCode === 0 ? "paid" : "failed",
        amount: rawData.amount,
        currency: "VND",
        rawData,
      };
    case "paypal":
      return {
        bookingId: rawData.resource?.custom_id || rawData.custom_id,
        transactionId: rawData.resource?.id || rawData.id,
        status:
          rawData.event_type === "CHECKOUT.ORDER.APPROVED" || rawData.status === "COMPLETED"
            ? "paid"
            : "failed",
        amount:
          rawData.resource?.purchase_units?.[0]?.amount?.value || rawData.amount,
        currency:
          rawData.resource?.purchase_units?.[0]?.amount?.currency_code || rawData.currency || "USD",
        rawData,
      };
    default:
      return null;
  }
}

/**
 * Verify webhook signature for each payment gateway.
 * @param {string} gateway - 'vnpay' | 'momo' | 'paypal'
 * @param {Request} request - Next.js Request object
 * @param {string} rawBody - Raw request body as string
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(gateway, request, rawBody) {
  switch (gateway) {
    case "vnpay": {
      const url = new URL(request.url);
      const params = {};
      url.searchParams.forEach((val, key) => { params[key] = val; });
      const result = verifyVNPayIPN(params);
      return result.valid;
    }
    case "momo": {
      try {
        const payload = JSON.parse(rawBody);
        const result = verifyMomoIPN(payload);
        return result.valid;
      } catch {
        return false;
      }
    }
    case "paypal": {
      try {
        const { getPayPalAccessToken } = await import("./paypal");
        const token = await getPayPalAccessToken();

        const PAYPAL_API_BASE =
          process.env.PAYPAL_MODE === "live"
            ? "https://api-m.paypal.com"
            : "https://api-m.sandbox.paypal.com";

        const verifyResponse = await fetch(
          `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              auth_algo: request.headers.get("paypal-auth-algo") || "",
              cert_url: request.headers.get("paypal-cert-url") || "",
              transmission_id: request.headers.get("paypal-transmission-id") || "",
              transmission_sig: request.headers.get("paypal-transmission-sig") || "",
              transmission_time: request.headers.get("paypal-transmission-time") || "",
              webhook_id: process.env.PAYPAL_WEBHOOK_ID || "",
              webhook_event: JSON.parse(rawBody),
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        const result = await verifyResponse.json();
        return result.verification_status === "SUCCESS";
      } catch (err) {
        console.error("[PayPal] Webhook verification failed:", err.message);
        return process.env.PAYPAL_MODE !== "live";
      }
    }
    default:
      return false;
  }
}
