/**
 * Firebase Cloud Functions entry point.
 * Registers all function groups: Express micro-monoliths, Firestore triggers, scheduled tasks.
 *
 * HTTP functions are grouped into Express apps (micro-monoliths) to reduce
 * deployed function count and improve cold-start management:
 *   - apiCore:       bookings, availability, email, auth, contact, cart
 *   - apiPayments:   payment creation, retry, return, log, MoMo
 *   - apiWebhooks:   ERP webhooks, payment gateway callbacks
 *   - apiAgents:     agent task endpoints
 *
 * Firestore triggers and scheduled functions remain as individual exports
 * since they cannot be grouped into Express apps.
 */

// Prevent MaxListenersExceededWarning caused by firebase-functions v2 SDK
// registering process.on('uncaughtException', ...) for each exported function
// trigger (14+ triggers exceeding the default 10-listener limit).
process.setMaxListeners(0);

import { onRequest, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import "@9trip/shared/logger";
import { adminDb } from './src/lib/firebase-admin.js';
import {
	sendBookingConfirmation,
	sendPaymentReceipt,
	sendWelcomeEmail,
	sendPasswordChangedEmail,
	sendBookingCancelledEmail,
	sendBookingModifiedEmail,
} from './src/notifications/email.js';
import { EmailMissingError } from '@9trip/shared/email/service';
import { cleanupExpiredHolds as cleanupHolds, cancelAbandonedBookings as cancelBookings } from './src/scheduled/cleanup.js';
import { executeAgentTask } from './src/agents/executor.js';
import { handleChat } from './emily/index.js';

// ─── Email Notifications ──────────────────────────────────────────────

/**
 * Send booking confirmation email when a new booking is created.
 */
export const onBookingCreated = onDocumentCreated({ document: 'bookings/{bookingId}', region: 'asia-southeast1' }, async (event) => {
	const booking = event.data.data();
	if (!booking) return;
	try {
		await sendBookingConfirmation(adminDb, booking, event.params.bookingId);
	} catch (err) {
		if (err instanceof EmailMissingError) {
			console.warn(`[email] ${err.message}`);
			return;
		}
		throw err;
	}
});

/**
 * Send payment receipt when booking status changes to "paid".
 */
export const onBookingPaid = onDocumentUpdated({ document: 'bookings/{bookingId}', region: 'asia-southeast1' }, async (event) => {
	const before = event.data.before.data();
	const after = event.data.after.data();
	if (!before || !after) return;

	// Only trigger when status changes to "paid"
	if (before.status !== 'paid' && after.status === 'paid') {
		try {
			await sendPaymentReceipt(adminDb, after, event.params.bookingId);
		} catch (err) {
			if (err instanceof EmailMissingError) {
				console.warn(`[email] ${err.message}`);
				return;
			}
			throw err;
		}
	}
});

/**
 * Send welcome email when a new user is created.
 */
export const onUserCreated = onDocumentCreated({ document: 'users/{userId}', region: 'asia-southeast1' }, async (event) => {
	const user = event.data.data();
	if (!user) return;
	try {
		await sendWelcomeEmail(adminDb, user, event.params.userId);
	} catch (err) {
		if (err instanceof EmailMissingError) {
			console.warn(`[email] ${err.message}`);
			return;
		}
		throw err;
	}
});

/**
 * Send password changed notification when user doc is updated with passwordChangedAt.
 */
export const onPasswordChanged = onDocumentUpdated({ document: 'users/{userId}', region: 'asia-southeast1' }, async (event) => {
	const before = event.data.before.data();
	const after = event.data.after.data();
	if (!before || !after) return;

	if (!before.passwordChangedAt && after.passwordChangedAt) {
		try {
			await sendPasswordChangedEmail(adminDb, after, event.params.userId);
		} catch (err) {
			if (err instanceof EmailMissingError) {
				console.warn(`[email] ${err.message}`);
				return;
			}
			throw err;
		}
	}
});

/**
 * Send cancellation email when a booking status changes to "cancelled".
 * Also passes the cancellation reason if available.
 */
export const onBookingCancelled = onDocumentUpdated({ document: 'bookings/{bookingId}', region: 'asia-southeast1' }, async (event) => {
	const before = event.data.before.data();
	const after = event.data.after.data();
	if (!before || !after) return;

	// Only trigger when status changes to "cancelled"
	if (before.status !== 'cancelled' && after.status === 'cancelled') {
		const reason = after.cancellationReason || after.cancelReason || after.note || '';
		try {
			await sendBookingCancelledEmail(adminDb, after, event.params.bookingId, reason);
		} catch (err) {
			if (err instanceof EmailMissingError) {
				console.warn(`[email] ${err.message}`);
				return;
			}
			throw err;
		}
	}
});

/**
 * Vietnamese labels for booking fields shown in modification emails.
 * @type {Object<string, string>}
 */
const FIELD_LABELS = {
	startDate: 'Ngày bắt đầu',
	endDate: 'Ngày kết thúc',
	adults: 'Người lớn',
	children: 'Trẻ em',
	totalAmount: 'Tổng tiền',
	serviceName: 'Dịch vụ',
	serviceType: 'Loại dịch vụ',
};

/**
 * Send modification email when a confirmed booking's fields change.
 * Detects changes to dates, guests, services, or pricing while bookingStatus stays "confirmed".
 */
export const onBookingModified = onDocumentUpdated({ document: 'bookings/{bookingId}', region: 'asia-southeast1' }, async (event) => {
	const before = event.data.before.data();
	const after = event.data.after.data();
	if (!before || !after) return;
  
	// Only trigger for confirmed bookings (check both status fields)
	if (after.status !== 'confirmed' && after.bookingStatus !== 'confirmed') return;

	// Fields that indicate meaningful modifications
	const watchedFields = ['startDate', 'endDate', 'adults', 'children', 'items', 'payment'];
	let hasChanged = false;
	const changes = {};

	for (const field of watchedFields) {
		const oldVal = before[field];
		const newVal = after[field];
		if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
			hasChanged = true;
			const label = FIELD_LABELS[field] || field;
			changes[label] = `${oldVal || '—'} → ${newVal || '—'}`;
		}
	}

	if (hasChanged) {
		try {
			await sendBookingModifiedEmail(adminDb, after, event.params.bookingId, changes);
		} catch (err) {
			if (err instanceof EmailMissingError) {
				console.warn(`[email] ${err.message}`);
				return;
			}
			throw err;
		}
	}
});

// ─── Scheduled Tasks ──────────────────────────────────────────────────

/**
 * Cleanup expired inventory holds — every 5 minutes.
 */
export const cleanupExpiredHolds = onSchedule({ schedule: 'every 5 minutes', region: 'asia-southeast1' }, async () => {
	await cleanupHolds(adminDb);
});

/**
 * Cancel abandoned unpaid bookings — every hour.
 */
export const cancelAbandonedBookings = onSchedule({ schedule: 'every 60 minutes', region: 'asia-southeast1' }, async () => {
	await cancelBookings(adminDb);
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
	await executeAgentTask(adminDb, snap, event);
});

// ─── Emily Chat ───────────────────────────────────────────────────────

/**
 * Emily chat — AI customer support chatbot.
 * Trigger: Callable function (chatWithEmily)
 */
export const chatWithEmily = onCall({ region: 'asia-southeast1' }, async (request) => {
  return await handleChat(request, adminDb);
});

// ─── API Micro-Monoliths (Vercel API Routes Migration) ──────────────────

import apiCoreApp from './src/apps/apiCore.js';
import apiPaymentsApp from './src/apps/apiPayments.js';
import apiWebhooksApp from './src/apps/apiWebhooks.js';
import apiAgentsApp from './src/apps/apiAgents.js';

const apiBaseConfig = {
  region: 'asia-southeast1',
  concurrency: 80,
  memory: '512MiB',
  timeoutSeconds: 120,
  minInstances: 0,
  cors: true,
};

export const apiCore = onRequest(apiBaseConfig, apiCoreApp);
export const apiPayments = onRequest({ ...apiBaseConfig, timeoutSeconds: 300, minInstances: 0 }, apiPaymentsApp);
export const apiWebhooks = onRequest({ ...apiBaseConfig, minInstances: 0 }, apiWebhooksApp);
export const apiAgents = onRequest(apiBaseConfig, apiAgentsApp);

