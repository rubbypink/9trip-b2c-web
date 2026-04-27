/**
 * PayPal Payment Module — Real Integration via REST API.
 *
 * Flow: get token → create order → user approves → capture order.
 * Sandbox: https://api-m.sandbox.paypal.com
 * Production: https://api-m.paypal.com
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

const PAYPAL_API_BASE = PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let cachedToken = null;

/**
 * Get PayPal OAuth2 access token (cached with 60s buffer).
 * @returns {Promise<string>}
 */
export async function getPayPalAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`PayPal auth failed: ${err.error_description || response.statusText}`);
  }

  const data = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

/**
 * Create a PayPal order for the user to approve.
 * @param {Object} options
 * @param {number} options.amount
 * @param {string} [options.currency]
 * @param {string} options.bookingId
 * @param {string} [options.description]
 * @returns {Promise<{ success: boolean, orderId?: string, approvalUrl?: string, message?: string }>}
 */
export async function createPayPalOrder({ amount, currency = "USD", bookingId, description }) {
  try {
    const token = await getPayPalAccessToken();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com";

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        custom_id: bookingId,
        description: description || `Booking ${bookingId}`,
        amount: { currency_code: currency, value: amount.toFixed(2) },
      }],
      application_context: {
        brand_name: "9 Trip Phú Quốc",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${siteUrl}/booking/return?gateway=paypal`,
        cancel_url: `${siteUrl}/checkout`,
      },
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(orderPayload),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || `PayPal order creation failed (${response.status})` };
    }

    const approvalLink = data.links?.find((link) => link.rel === "approve");
    return { success: true, orderId: data.id, approvalUrl: approvalLink?.href || null };
  } catch (err) {
    console.error("[PayPal] Create order failed:", err.message);
    return { success: false, message: `Không thể kết nối đến PayPal: ${err.message}` };
  }
}

/**
 * Capture an approved PayPal order.
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<{ success: boolean, captureId?: string, amount?: number, currency?: string, bookingId?: string, status?: string, message?: string }>}
 */
export async function capturePayPalOrder(orderId) {
  try {
    const token = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || `PayPal capture failed (${response.status})` };
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

    return {
      success: data.status === "COMPLETED",
      captureId: capture?.id || null,
      amount: capture?.amount?.value ? Number(capture.amount.value) : null,
      currency: capture?.amount?.currency_code || null,
      bookingId: data.purchase_units?.[0]?.custom_id || null,
      status: data.status,
    };
  } catch (err) {
    console.error("[PayPal] Capture failed:", err.message);
    return { success: false, message: `Không thể xác nhận thanh toán PayPal: ${err.message}` };
  }
}
