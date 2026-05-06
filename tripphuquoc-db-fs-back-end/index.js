/**
 * Firebase Cloud Functions entry point.
 * Registers all function groups: payment webhooks, email notifications, scheduled tasks.
 */
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

// Initialize Firebase Admin
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// ─── Payment Webhook ──────────────────────────────────────────────────

const { handlePaymentWebhook } = require("./src/webhooks/payment");

/**
 * Payment webhook — receives callbacks from payment gateways.
 * Trigger: HTTP GET/POST /paymentWebhook?gateway=<vnpay|momo|paypal>
 *   - VNPay: GET with query params (IPN)
 *   - MoMo: POST with JSON body (IPN)
 *   - PayPal: POST with JSON body + headers (webhook)
 */
exports.paymentWebhook = onRequest(
  { cors: true, region: "asia-southeast1" },
  async (req, res) => {
    try {
      const result = await handlePaymentWebhook(req, db);
      res.status(200).json(result);
    } catch (error) {
      console.error("Payment webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ─── MoMo Payment Creation ────────────────────────────────────────────

const { createMomoPayment } = require("./src/payments/momo");

/**
 * Create MoMo payment — proxy for Next.js API route.
 * Trigger: HTTP POST /createMomoPayment
 *
 * MoMo API requires 30s timeout (exceeds Vercel Hobby 10s limit),
 * so this runs on Cloud Functions (9 min timeout).
 */
exports.createMomoPayment = onRequest(
  { cors: true, region: "asia-southeast1" },
  async (req, res) => {
    try {
      const { bookingId, amount, bookingCode, orderInfo } = req.body;

      if (!bookingId || !amount) {
        return res.status(400).json({ error: "Missing bookingId or amount" });
      }

      const result = await createMomoPayment({ bookingId, amount, bookingCode, orderInfo });

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(502).json({ error: result.message });
      }
    } catch (error) {
      console.error("MoMo creation error:", error);
      res.status(500).json({ error: "Không thể tạo thanh toán MoMo. Vui lòng thử lại." });
    }
  }
);

// ─── Email Notifications ──────────────────────────────────────────────

const { sendBookingConfirmation, sendPaymentReceipt } = require("./src/notifications/email");

/**
 * Send booking confirmation email when a new booking is created.
 */
exports.onBookingCreated = onDocumentCreated(
  { document: "bookings/{bookingId}", region: "asia-southeast1" },
  async (event) => {
    const booking = event.data.data();
    if (!booking) return;
    await sendBookingConfirmation(db, booking, event.params.bookingId);
  }
);

/**
 * Send payment receipt when booking status changes to "paid".
 */
exports.onBookingPaid = onDocumentUpdated(
  { document: "bookings/{bookingId}", region: "asia-southeast1" },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;

    // Only trigger when status changes to "paid"
    if (before.paymentStatus !== "paid" && after.paymentStatus === "paid") {
      await sendPaymentReceipt(db, after, event.params.bookingId);
    }
  }
);

// ─── Scheduled Tasks ──────────────────────────────────────────────────

const { cleanupExpiredHolds, cancelAbandonedBookings } = require("./src/scheduled/cleanup");

/**
 * Cleanup expired inventory holds — every 5 minutes.
 */
exports.cleanupExpiredHolds = onSchedule(
  { schedule: "every 5 minutes", region: "asia-southeast1" },
  async () => {
    await cleanupExpiredHolds(db);
  }
);

/**
 * Cancel abandoned unpaid bookings — every hour.
 */
exports.cancelAbandonedBookings = onSchedule(
  { schedule: "every 60 minutes", region: "asia-southeast1" },
  async () => {
    await cancelAbandonedBookings(db);
  }
);
