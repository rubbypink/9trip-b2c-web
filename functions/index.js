/**
 * Firebase Cloud Functions entry point.
 * Registers all function groups: payment webhooks, email notifications, scheduled tasks.
 */
import 'dotenv/config';
import { onRequest, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import admin from 'firebase-admin';
import { handlePaymentWebhook } from './src/webhooks/payment.js';
import { createMomoPayment as createMomo } from './src/payments/momo.js';
import { sendBookingConfirmation, sendPaymentReceipt } from './src/notifications/email.js';
import { cleanupExpiredHolds as cleanupHolds, cancelAbandonedBookings as cancelBookings } from './src/scheduled/cleanup.js';
import { executeAgentTask } from './src/agents/executor.js';
import { handleChat } from './emily/index.js';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ─── Payment Webhook ──────────────────────────────────────────────────

/**
 * Payment webhook — receives callbacks from payment gateways.
 * Trigger: HTTP GET/POST /paymentWebhook?gateway=<vnpay|momo|paypal>
 *   - VNPay: GET with query params (IPN)
 *   - MoMo: POST with JSON body (IPN)
 *   - PayPal: POST with JSON body + headers (webhook)
 */
export const paymentWebhook = onRequest({ cors: true, region: 'asia-southeast1' }, async (req, res) => {
	try {
		const result = await handlePaymentWebhook(req, db);
		res.status(200).json(result);
	} catch (error) {
		console.error('Payment webhook error:', error);
		res.status(400).json({ error: error.message });
	}
});

// ─── MoMo Payment Creation ────────────────────────────────────────────

/**
 * Create MoMo payment — proxy for Next.js API route.
 * Trigger: HTTP POST /createMomoPayment
 *
 * MoMo API requires 30s timeout (exceeds Vercel Hobby 10s limit),
 * so this runs on Cloud Functions (9 min timeout).
 */
export const createMomoPayment = onRequest({ cors: true, region: 'asia-southeast1' }, async (req, res) => {
	try {
		const { bookingId, amount, bookingCode, orderInfo } = req.body;

		if (!bookingId || !amount) {
			return res.status(400).json({ error: 'Missing bookingId or amount' });
		}

		const result = await createMomo({ bookingId, amount, bookingCode, orderInfo });

		if (result.success) {
			res.status(200).json(result);
		} else {
			res.status(502).json({ error: result.message });
		}
	} catch (error) {
		console.error('MoMo creation error:', error);
		res.status(500).json({ error: 'Không thể tạo thanh toán MoMo. Vui lòng thử lại.' });
	}
});

// ─── Email Notifications ──────────────────────────────────────────────

/**
 * Send booking confirmation email when a new booking is created.
 */
export const onBookingCreated = onDocumentCreated({ document: 'bookings/{bookingId}', region: 'asia-southeast1' }, async (event) => {
	const booking = event.data.data();
	if (!booking) return;
	await sendBookingConfirmation(db, booking, event.params.bookingId);
});

/**
 * Send payment receipt when booking status changes to "paid".
 */
export const onBookingPaid = onDocumentUpdated({ document: 'bookings/{bookingId}', region: 'asia-southeast1' }, async (event) => {
	const before = event.data.before.data();
	const after = event.data.after.data();
	if (!before || !after) return;

	// Only trigger when status changes to "paid"
	if (before.paymentStatus !== 'paid' && after.paymentStatus === 'paid') {
		await sendPaymentReceipt(db, after, event.params.bookingId);
	}
});

// ─── Scheduled Tasks ──────────────────────────────────────────────────

/**
 * Cleanup expired inventory holds — every 5 minutes.
 */
export const cleanupExpiredHolds = onSchedule({ schedule: 'every 5 minutes', region: 'asia-southeast1' }, async () => {
	await cleanupHolds(db);
});

/**
 * Cancel abandoned unpaid bookings — every hour.
 */
export const cancelAbandonedBookings = onSchedule({ schedule: 'every 60 minutes', region: 'asia-southeast1' }, async () => {
	await cancelBookings(db);
});

// ─── Agent Task Executor ──────────────────────────────────────────────

/**
 * Agent task executor — listens for new agentTasks documents and executes them.
 * Trigger: document created in agentTasks/{taskId}
 *
 * Handles both skill and flow execution:
 *   - 'firestore-task' mode: executes directly (media-finder, orchestrator, etc.)
 *   - 'agent-only' mode: leaves as 'queued_for_agent' for external AI agent
 */
export const onAgentTaskCreated = onDocumentCreated({ document: 'agentTasks/{taskId}', region: 'asia-southeast1' }, async (event) => {
	const snap = event.data;
	if (!snap) return;
	await executeAgentTask(db, snap, event);
});

// ─── Emily Chat ───────────────────────────────────────────────────────

/**
 * Emily chat — AI customer support chatbot.
 * Trigger: Callable function (chatWithEmily)
 */
export const chatWithEmily = onCall({ region: 'asia-southeast1' }, async (request) => {
  return await handleChat(request, db);
});
