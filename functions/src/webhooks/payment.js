/**
 * Payment webhook handler — normalizes payload from various gateways
 * and updates booking status in Firestore.
 */

/**
 * Normalize gateway-specific payload to a standard format.
 * @param {string} gateway - Payment gateway name
 * @param {Object} body - Raw webhook body
 * @returns {{ bookingId: string, transactionId: string, status: string, amount: number, currency: string }}
 */
function normalizePayload(gateway, body) {
  switch (gateway) {
    case "stripe":
      return {
        bookingId: body.data?.object?.metadata?.bookingId || "",
        transactionId: body.data?.object?.id || "",
        status: body.type === "checkout.session.completed" ? "paid" : "failed",
        amount: (body.data?.object?.amount_total || 0) / 100,
        currency: (body.data?.object?.currency || "vnd").toUpperCase(),
      };

    case "vnpay":
      return {
        bookingId: body.vnp_TxnRef || body.bookingId || "",
        transactionId: body.vnp_TransactionNo || body.transactionId || "",
        status: body.vnp_ResponseCode === "00" ? "paid" : "failed",
        amount: parseInt(body.vnp_Amount || "0", 10) / 100,
        currency: "VND",
      };

    case "momo":
      return {
        bookingId: body.orderId || body.bookingId || "",
        transactionId: body.transId || body.transactionId || "",
        status: body.resultCode === 0 ? "paid" : "failed",
        amount: body.amount || 0,
        currency: "VND",
      };

    case "paypal":
      return {
        bookingId: body.resource?.custom_id || body.bookingId || "",
        transactionId: body.resource?.id || body.transactionId || "",
        status: body.event_type === "PAYMENT.CAPTURE.COMPLETED" ? "paid" : "failed",
        amount: parseFloat(body.resource?.amount?.value || "0"),
        currency: (body.resource?.amount?.currency_code || "USD").toUpperCase(),
      };

    default:
      throw new Error(`Unsupported gateway: ${gateway}`);
  }
}

/**
 * Verify webhook signature based on gateway.
 * In production, use gateway SDKs for proper verification.
 * @param {Object} req - Express request
 * @param {string} gateway
 * @returns {boolean}
 */
async function verifySignature(req, gateway) {
  // TODO: Implement real signature verification per gateway
  // - Stripe: stripe.webhooks.constructEvent(rawBody, signature, secret)
  // - VNPay: verify secure hash with vnp_SecureHash
  // - Momo: verify signature with accessKey + secretKey
  // - PayPal: verify with PayPal SDK

  // For now, accept all in development
  if (process.env.FUNCTIONS_EMULATOR === "true") return true;

  console.warn(`[payment] Signature verification not implemented for ${gateway}`);
  return true;
}

/**
 * Handle payment webhook — normalize, verify, update booking.
 * @param {Object} req - Express request
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @returns {Promise<{received: boolean}>}
 */
async function handlePaymentWebhook(req, db) {
  const { gateway } = req.query;

  if (!gateway) {
    throw new Error("Missing 'gateway' query parameter");
  }

  // Verify webhook authenticity
  const isValid = await verifySignature(req, gateway);
  if (!isValid) {
    throw new Error("Invalid webhook signature");
  }

  // Normalize payload
  const payment = normalizePayload(gateway, req.body);

  if (!payment.bookingId) {
    throw new Error("Missing bookingId in webhook payload");
  }

  // Update booking in Firestore
  const bookingRef = db.collection("bookings").doc(payment.bookingId);
  const bookingDoc = await bookingRef.get();

  if (!bookingDoc.exists) {
    throw new Error(`Booking ${payment.bookingId} not found`);
  }

  const updateData = {
    paymentStatus: payment.status,
    transactionId: payment.transactionId,
    paidAmount: payment.amount,
    currency: payment.currency,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await bookingRef.update(updateData);

  // If payment successful, release any inventory holds
  if (payment.status === "paid") {
    const booking = bookingDoc.data();
    if (booking.inventoryHoldId) {
      try {
        await db.collection("inventory_holds").doc(booking.inventoryHoldId).delete();
      } catch (err) {
        console.warn(`Failed to release inventory hold ${booking.inventoryHoldId}:`, err);
      }
    }
  }

  console.log(`[payment] Booking ${payment.bookingId} updated to ${payment.status} via ${gateway}`);
  return { received: true };
}

module.exports = { handlePaymentWebhook };
