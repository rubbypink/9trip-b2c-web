/**
 * Email notification functions.
 *
 * Consumes {@link module:email-service} for pooled transporter + retry logic,
 * and {@link module:templates} for HTML template generation.
 *
 * Every function throws {@link module:email-service.EmailMissingError}
 * when no recipient address is available (instead of silently skipping).
 *
 * @module email
 */

import { EmailMissingError, sendMailWithRetry } from "./email-service.js";
import {
	bookingConfirmationTemplate,
	paymentReceiptTemplate,
	welcomeTemplate,
	passwordChangedTemplate,
	bookingCancelledTemplate,
	bookingModifiedTemplate,
} from "./templates.js";

// ─── Sender Helpers ────────────────────────────────────────────────────

/**
 * Default sender address — used when SMTP_FROM env var is not set.
 * @type {string}
 */
const DEFAULT_FROM = `"9 Trip Phú Quốc" <info@9tripphuquoc.com>`;

/**
 * Resolve the "from" address.
 * @returns {string}
 */
function getFromAddress() {
	return process.env.SMTP_FROM || DEFAULT_FROM;
}

/**
 * Extract the user's email from a booking document.
 * Checks common field names.
 * @param {Object} booking
 * @returns {string|undefined}
 */
function getBookingEmail(booking) {
	return booking.userEmail || booking.email || booking.contactInfo?.email;
}

/**
 * Extract the user's display name from a booking document.
 * @param {Object} booking
 * @returns {string}
 */
function getBookingName(booking) {
	return booking.userName || booking.contactInfo?.fullName || "Quý khách";
}

// ─── Email Functions ───────────────────────────────────────────────────

/**
 * Send booking confirmation email.
 *
 * Triggered when a new booking document is created.
 *
 * @param {FirebaseFirestore.Firestore} db       - Firestore instance (unused, kept for signature compat)
 * @param {Object}                      booking  - Booking document data
 * @param {string}                      bookingId - Booking document ID
 * @returns {Promise<nodemailer.SentMessageInfo>}
 * @throws {EmailMissingError} If no recipient email is found on the booking
 */
export async function sendBookingConfirmation(db, booking, bookingId) {
	const email = getBookingEmail(booking);
	if (!email) {
		throw new EmailMissingError(`sendBookingConfirmation(bookingId=${bookingId})`);
	}

	const html = bookingConfirmationTemplate(booking);
	const code = booking.bookingCode || bookingId;

	return sendMailWithRetry({
		from: getFromAddress(),
		to: email,
		subject: `Xác nhận đặt dịch vụ #${code}`,
		html,
	});
}

/**
 * Send payment receipt email when a booking is marked as paid.
 *
 * @param {FirebaseFirestore.Firestore} db       - Firestore instance
 * @param {Object}                      booking  - Booking document data
 * @param {string}                      bookingId - Booking document ID
 * @returns {Promise<nodemailer.SentMessageInfo>}
 * @throws {EmailMissingError} If no recipient email is found
 */
export async function sendPaymentReceipt(db, booking, bookingId) {
	const email = getBookingEmail(booking);
	if (!email) {
		throw new EmailMissingError(`sendPaymentReceipt(bookingId=${bookingId})`);
	}

	const html = paymentReceiptTemplate(booking);
	const code = booking.bookingCode || bookingId;

	return sendMailWithRetry({
		from: getFromAddress(),
		to: email,
		subject: `Thanh toán thành công — Đặt dịch vụ #${code}`,
		html,
	});
}

/**
 * Send welcome email to a newly registered user.
 *
 * @param {FirebaseFirestore.Firestore} db     - Firestore instance
 * @param {Object}                      user   - User document data
 * @param {string}                      userId - User document ID
 * @returns {Promise<nodemailer.SentMessageInfo>}
 * @throws {EmailMissingError} If no email is found on the user document
 */
export async function sendWelcomeEmail(db, user, userId) {
	const email = user.email || user.userEmail;
	if (!email) {
		throw new EmailMissingError(`sendWelcomeEmail(userId=${userId})`);
	}

	const name = user.displayName || user.name || "";
	const html = welcomeTemplate(name);

	return sendMailWithRetry({
		from: getFromAddress(),
		to: email,
		subject: `Chào mừng đến với 9 Trip Phú Quốc!`,
		html,
	});
}

/**
 * Notify the user that their password has been changed.
 *
 * @param {FirebaseFirestore.Firestore} db       - Firestore instance
 * @param {Object}                      user     - User document data
 * @param {string}                      userId   - User document ID
 * @returns {Promise<nodemailer.SentMessageInfo>}
 * @throws {EmailMissingError} If no email is found on the user document
 */
export async function sendPasswordChangedEmail(db, user, userId) {
	const email = user.email || user.userEmail;
	if (!email) {
		throw new EmailMissingError(`sendPasswordChangedEmail(userId=${userId})`);
	}

	const name = user.displayName || user.name || "";
	const changedAt = user.passwordChangedAt || new Date();
	const html = passwordChangedTemplate(name, changedAt);

	return sendMailWithRetry({
		from: getFromAddress(),
		to: email,
		subject: "Mật khẩu đã được thay đổi",
		html,
	});
}

/**
 * Send booking cancellation confirmation email.
 *
 * @param {FirebaseFirestore.Firestore} db        - Firestore instance
 * @param {Object}                      booking   - Booking document data
 * @param {string}                      bookingId - Booking document ID
 * @param {string}                      [reason]  - Optional cancellation reason
 * @returns {Promise<nodemailer.SentMessageInfo>}
 * @throws {EmailMissingError} If no recipient email is found
 */
export async function sendBookingCancelledEmail(db, booking, bookingId, reason) {
	const email = getBookingEmail(booking);
	if (!email) {
		throw new EmailMissingError(`sendBookingCancelledEmail(bookingId=${bookingId})`);
	}

	const html = bookingCancelledTemplate(booking, reason);
	const code = booking.bookingCode || bookingId;

	return sendMailWithRetry({
		from: getFromAddress(),
		to: email,
		subject: `Xác nhận hủy đơn hàng #${code}`,
		html,
	});
}

/**
 * Notify the user that their booking has been modified.
 *
 * @param {FirebaseFirestore.Firestore} db        - Firestore instance
 * @param {Object}                      booking   - Updated booking document data
 * @param {string}                      bookingId - Booking document ID
 * @param {Object}                      [changes] - Description of changes (e.g. { "Ngày bắt đầu": "01/03 → 05/03" })
 * @returns {Promise<nodemailer.SentMessageInfo>}
 * @throws {EmailMissingError} If no recipient email is found
 */
export async function sendBookingModifiedEmail(db, booking, bookingId, changes) {
	const email = getBookingEmail(booking);
	if (!email) {
		throw new EmailMissingError(`sendBookingModifiedEmail(bookingId=${bookingId})`);
	}

	const html = bookingModifiedTemplate(booking, changes);
	const code = booking.bookingCode || bookingId;

	return sendMailWithRetry({
		from: getFromAddress(),
		to: email,
		subject: `Cập nhật đơn hàng #${code}`,
		html,
	});
}
