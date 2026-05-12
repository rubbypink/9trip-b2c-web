/**
 * Email Service — pooled SMTP transporter, retry logic, error classification, template senders.
 *
 * Central email service used by both Next.js (src/) and Cloud Functions (functions/).
 * Provides:
 * - EmailMissingError     — thrown when no recipient address is provided
 * - isRetryableError()    — classify errors as retryable vs non-retryable
 * - createTransporter()   — pooled SMTP with connection reuse (max 5)
 * - withRetry(fn, opts)   — exponential backoff with jitter
 * - sendMailWithRetry()   — send mail with automatic retry
 * - sendEmail()           — simple send returning { success, messageId?, error? }
 * - send*Email()          — template-based sender functions
 *
 * @module email-service
 */

import nodemailer from "nodemailer";

// ─── Error Classes ─────────────────────────────────────────────────────

/**
 * Error thrown when an email is requested but no recipient address exists.
 * @extends Error
 */
export class EmailMissingError extends Error {
	/**
	 * @param {string} [context] - Description of the email that was skipped
	 */
	constructor(context = "unknown") {
		super(`Email không được gửi: thiếu địa chỉ người nhận (${context})`);
		this.name = "EmailMissingError";
		this.context = context;
	}
}

// ─── Error Classification ──────────────────────────────────────────────

/**
 * Set of Nodemailer error codes that are safe to retry.
 * These indicate transient network / DNS / socket issues.
 * @type {Set<string>}
 */
const RETRYABLE_CODES = new Set([
	"ECONNECTION", // Connection refused / failed
	"ETIMEDOUT",   // Socket timed out
	"EDNS",        // DNS resolution failed
	"ESOCKET",     // Socket error (e.g. premature close)
	"ETLS",        // TLS negotiation failed
]);

/**
 * Set of Nodemailer error codes that MUST NOT be retried.
 * These indicate authentication or configuration issues.
 * @type {Set<string>}
 */
const NON_RETRYABLE_CODES = new Set([
	"EAUTH",       // Authentication failed
	"EENVELOPE",   // Invalid envelope (bad address, etc.)
]);

/**
 * Determine whether an error is retryable (transient) or not.
 *
 * Retryable errors: connection, DNS, timeout, socket, TLS failures.
 * Non-retryable: authentication failures, invalid addresses.
 * Unknown errors (no code) are treated as retryable to be safe.
 *
 * @param {Error} err - The error to classify
 * @returns {boolean} true if the error is safe to retry
 */
export function isRetryableError(err) {
	if (!err || !err.code) return true; // Unknown — treat as retryable

	if (RETRYABLE_CODES.has(err.code)) return true;
	if (NON_RETRYABLE_CODES.has(err.code)) return false;

	// Some libraries put the code in a nested `errInfo` or use lower-case
	const code = (err.code || "").toUpperCase();
	if (RETRYABLE_CODES.has(code)) return true;
	if (NON_RETRYABLE_CODES.has(code)) return false;

	// Default: retryable for unknown codes
	return true;
}

// ─── SMTP Configuration ────────────────────────────────────────────────

const SMTP_CONFIG = {
	host: process.env.SMTP_HOST || "pro16.emailserver.vn",
	port: Number(process.env.SMTP_PORT) || 465,
	secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465" || true,
	auth: {
		user: process.env.SMTP_USER || "info@9tripphuquoc.com",
		pass: process.env.SMTP_PASS || "",
	},
};

if (!SMTP_CONFIG.auth.pass) {
	console.warn("[Email] Warning: SMTP_PASS is empty. Email sending will fail. Set SMTP_PASS in your environment.");
}

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER || "info@9tripphuquoc.com";

// ─── Transporter ───────────────────────────────────────────────────────

/**
 * Lazily-initialised pooled SMTP transporter singleton.
 * @type {nodemailer.Transporter|null}
 */
let _transporter = null;

/**
 * Create (or return) a pooled SMTP transporter.
 *
 * In production (SMTP_HOST set), creates a pooled transporter with:
 *   - max 5 simultaneous connections
 *   - connection reuse via pool:true
 *   - rate limiting disabled (we handle retry ourselves)
 *
 * In development (no SMTP_HOST), returns a fake transporter that logs.
 *
 * @returns {nodemailer.Transporter} A nodemailer-like transporter
 */
export function createTransporter() {
	if (_transporter) return _transporter;

	if (process.env.SMTP_HOST) {
		_transporter = nodemailer.createTransport({
			pool: true,
			maxConnections: 5,
			maxMessages: 100,
			host: process.env.SMTP_HOST,
			port: parseInt(process.env.SMTP_PORT || "587", 10),
			secure: process.env.SMTP_SECURE === "true",
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		});
	} else {
		// Fallback: log to console in development / CI
		console.warn("[email] No SMTP configured — using dev logger");
		_transporter = {
			sendMail: async (mailOptions) => {
				console.log("[email:dev] Would send:", {
					to: mailOptions.to,
					subject: mailOptions.subject,
				});
				return { messageId: "dev-" + Date.now(), accepted: [mailOptions.to].filter(Boolean) };
			},
			close: () => {},
		};
	}

	_transporter.on?.("error", (err) => {
		console.error("[Email] Transporter error:", err.message);
	});

	return _transporter;
}

// ─── Retry Utility ─────────────────────────────────────────────────────

/**
 * Default retry options.
 * @typedef {Object} RetryOptions
 * @property {number} [maxRetries=3]  - Maximum retry attempts
 * @property {number} [baseMs=1000]   - Base delay in ms
 * @property {number} [maxMs=30000]   - Maximum delay in ms
 * @property {number} [jitter=0.25]   - Jitter fraction (±25% by default)
 */

/**
 * Execute an async function with exponential backoff retry.
 *
 * Delays follow: delay = min(baseMs * 2^attempt, maxMs), then ±jitter randomisation.
 * Only retries on errors classified as retryable by {@link isRetryableError}.
 * Non-retryable errors (e.g. EAUTH) are thrown immediately.
 *
 * @param {Function} fn       - Async function to execute
 * @param {RetryOptions} [opts] - Retry configuration
 * @returns {Promise<any>} The resolved value of `fn()`
 * @throws {Error} Throws the last error after exhausting retries, or non-retryable errors immediately
 */
export async function withRetry(fn, opts = {}) {
	const {
		maxRetries = 3,
		baseMs = 1000,
		maxMs = 30000,
		jitter = 0.25,
	} = opts;

	let lastError;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;

			if (!isRetryableError(err)) {
				throw err; // Non-retryable — bail immediately
			}

			if (attempt >= maxRetries) {
				console.error(`[email:retry] All ${maxRetries + 1} attempts failed:`, err.message);
				throw err;
			}

			// Exponential backoff: base * 2^attempt, capped at maxMs
			const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);

			// Apply uniform jitter: ±jitter% of delay
			const jitterAmount = delay * jitter * (Math.random() * 2 - 1);
			const actualDelay = Math.round(delay + jitterAmount);

			console.warn(
				`[email:retry] Attempt ${attempt + 1}/${maxRetries} failed (${err.code || "unknown"}), ` +
				`retrying in ${actualDelay}ms...`
			);

			await new Promise((resolve) => setTimeout(resolve, actualDelay));
		}
	}

	// TypeScript narrowing — should never reach here
	throw lastError;
}

// ─── sendMailWithRetry ─────────────────────────────────────────────────

/**
 * Send an email with automatic retry on transient failures.
 *
 * Combines {@link createTransporter} and {@link withRetry}:
 * obtains the (pooled) transporter and calls `transporter.sendMail()`
 * with exponential backoff.
 *
 * @param {nodemailer.SendMailOptions} mailOptions - Nodemailer mail options
 * @param {RetryOptions} [retryOpts] - Optional retry overrides
 * @returns {Promise<nodemailer.SentMessageInfo>} The send result
 * @throws {Error} On non-retryable errors or after exhausting retries
 */
export async function sendMailWithRetry(mailOptions, retryOpts = {}) {
	const transporter = createTransporter();

	return withRetry(async () => {
		const info = await transporter.sendMail(mailOptions);
		console.log(`[email] Sent to ${mailOptions.to}: "${mailOptions.subject}" (${info.messageId})`);
		return info;
	}, retryOpts);
}

// ─── sendEmail (simple wrapper, returns { success, error }) ────────────

/**
 * Send a single email with retry support, returning a result object.
 *
 * Unlike {@link sendMailWithRetry}, this never throws — instead returns
 * `{ success: false, error }` on failure.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text }) {
	if (!to || !subject || !html) {
		return { success: false, error: "Missing required fields (to, subject, html)" };
	}

	try {
		const info = await sendMailWithRetry({
			from: `"9 Trip Phú Quốc" <${FROM_ADDRESS}>`,
			to,
			subject,
			html,
			text: text || html.replace(/<[^>]*>/g, ""),
		});

		return { success: true, messageId: info.messageId };
	} catch (err) {
		console.error(`[Email] Failed to send to ${to}:`, err.message);
		return { success: false, error: err.message };
	}
}

// ─── Template-Based Sender Functions ───────────────────────────────────

/**
 * Send booking confirmation email to the customer.
 * @param {Object} booking - Booking document data
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendBookingConfirmation(booking) {
	const { bookingConfirmationTemplate } = await import("@9trip/shared/email/templates");
	const html = bookingConfirmationTemplate(booking);
	const email = booking.contactInfo?.email || booking.userEmail;

	if (!email) {
		return { success: false, error: "No customer email in booking" };
	}

	return sendEmail({
		to: email,
		subject: `Xác nhận đặt chỗ #${booking.bookingCode || booking.id} — 9 Trip Phú Quốc`,
		html,
	});
}

/**
 * Send payment confirmation email to the customer.
 * @param {Object} booking - Booking document data
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendPaymentConfirmation(booking) {
	const { paymentConfirmationTemplate } = await import("@9trip/shared/email/templates");
	const html = paymentConfirmationTemplate(booking);
	const email = booking.contactInfo?.email || booking.userEmail;

	if (!email) {
		return { success: false, error: "No customer email in booking" };
	}

	return sendEmail({
		to: email,
		subject: `Thanh toán thành công — Đơn #${booking.bookingCode || booking.id}`,
		html,
	});
}

/**
 * Send payment failure notification to the customer.
 * @param {Object} booking - Booking document data
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendPaymentFailed(booking) {
	const { paymentFailedTemplate } = await import("@9trip/shared/email/templates");
	const html = paymentFailedTemplate(booking);
	const email = booking.contactInfo?.email || booking.userEmail;

	if (!email) {
		return { success: false, error: "No customer email in booking" };
	}

	return sendEmail({
		to: email,
		subject: `Thanh toán thất bại — Đơn #${booking.bookingCode || booking.id}`,
		html,
	});
}

/**
 * Send cancellation confirmation to the customer.
 * @param {Object} booking - Booking document data
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendCancellationConfirmation(booking, reason) {
	const { cancellationTemplate } = await import("@9trip/shared/email/templates");
	const html = cancellationTemplate(booking, reason);
	const email = booking.contactInfo?.email || booking.userEmail;

	if (!email) {
		return { success: false, error: "No customer email in booking" };
	}

	return sendEmail({
		to: email,
		subject: `Xác nhận hủy đơn #${booking.bookingCode || booking.id} — 9 Trip Phú Quốc`,
		html,
	});
}

/**
 * Send password changed confirmation email to the user.
 * @param {string} to - Recipient email
 * @param {string} userName - User's display name
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendPasswordChangedEmail(to, userName) {
	const { passwordChangedTemplate } = await import("@9trip/shared/email/templates");
	const html = passwordChangedTemplate(userName);

	return sendEmail({
		to,
		subject: "Mật khẩu đã được thay đổi — 9 Trip Phú Quốc",
		html,
	});
}

/**
 * Send contact form notification to the admin.
 * @param {Object} data - Contact form data
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.phone
 * @param {string} data.message
 * @param {string} [data.subject]
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendContactNotification(data) {
	const { contactFormTemplate } = await import("@9trip/shared/email/templates");
	const html = contactFormTemplate(data);

	return sendEmail({
		to: FROM_ADDRESS,
		subject: `Liên hệ mới từ ${data.name || data.email} — 9 Trip`,
		html,
	});
}

/**
 * Send welcome email to newly registered user.
 * @param {string} to - Recipient email
 * @param {string} userName - User's display name
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendWelcomeEmail(to, userName) {
	const { welcomeTemplate } = await import("@9trip/shared/email/templates");
	const html = welcomeTemplate(userName);

	return sendEmail({
		to,
		subject: "Chào mừng đến với 9 Trip Phú Quốc!",
		html,
	});
}

/**
 * Send password reset email with reset link.
 * @deprecated Firebase Auth handles password reset natively via sendPasswordResetEmail().
 *   This function is kept for reference but should NOT be used in new code.
 * @param {string} to - Recipient email
 * @param {string} resetLink - Password reset link
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendPasswordReset(to, resetLink) {
	const { passwordResetTemplate } = await import("@9trip/shared/email/templates");
	const html = passwordResetTemplate(resetLink);

	return sendEmail({
		to,
		subject: "Đặt lại mật khẩu — 9 Trip Phú Quốc",
		html,
	});
}
