/**
 * Normalize payment notification payloads from various gateways.
 * @param {string} gateway - 'stripe' | 'vnpay' | 'momo' | 'paypal'
 * @param {Object} rawData - Original payload from gateway
 * @returns {Object} Normalized notification data
 */
export function normalizePaymentPayload(gateway, rawData) {
  switch (gateway) {
    case "stripe":
      return {
        bookingId: rawData.data?.object?.metadata?.bookingId,
        transactionId: rawData.data?.object?.id,
        status: rawData.type === "checkout.session.completed" ? "paid" : "failed",
        amount: rawData.data?.object?.amount_total / 100,
        currency: rawData.data?.object?.currency?.toUpperCase(),
        rawData,
      };
    case "vnpay":
      return {
        bookingId: rawData.vnp_TxnRef, // Assuming we send booking ID as TxnRef
        transactionId: rawData.vnp_TransactionNo,
        status: rawData.vnp_ResponseCode === "00" ? "paid" : "failed",
        amount: Number(rawData.vnp_Amount) / 100,
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
        bookingId: rawData.resource?.custom_id,
        transactionId: rawData.id,
        status: rawData.event_type === "CHECKOUT.ORDER.APPROVED" ? "paid" : "failed",
        amount: rawData.resource?.purchase_units?.[0]?.amount?.value,
        currency: rawData.resource?.purchase_units?.[0]?.amount?.currency_code,
        rawData,
      };
    default:
      return null;
  }
}

/**
 * Verify signature for incoming webhooks.
 * Note: Actual implementation depends on gateway specific libs.
 */
export async function verifyWebhookSignature(gateway, request, rawBody) {
  // Placeholder for security logic
  // In production, use crypto.createHmac or SDK provided methods
  return true; 
}
