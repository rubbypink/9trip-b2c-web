/**
 * Email Module — SMTP transport + send functions using nodemailer.
 *
 * Creates a single pooled SMTP transporter (reused across requests).
 * All email functions are safe to call from Server Components / API routes.
 */

import nodemailer from "nodemailer";

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "pro16.emailserver.vn",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465" || true,
  auth: {
    user: process.env.SMTP_USER || "info@9tripphuquoc.com",
    pass: process.env.SMTP_PASS || "",
  },
};

const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER || "info@9tripphuquoc.com";

/** @type {import("nodemailer").Transporter|null} */
let transporter = null;

/**
 * Get or create the SMTP transporter (pooled, reused).
 * @returns {import("nodemailer").Transporter}
 */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      ...SMTP_CONFIG,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    transporter.on("error", (err) => {
      console.error("[Email] Transporter error:", err.message);
    });
  }
  return transporter;
}

/**
 * Send a single email.
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
    const info = await getTransporter().sendMail({
      from: `"9 Trip Phú Quốc" <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });

    console.log(`[Email] Sent: "${subject}" → ${to} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send booking confirmation email to the customer.
 * @param {Object} booking - Booking document data
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendBookingConfirmation(booking) {
  const { bookingConfirmationTemplate } = await import("./email-templates");
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
  const { paymentConfirmationTemplate } = await import("./email-templates");
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
  const { paymentFailedTemplate } = await import("./email-templates");
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
  const { cancellationTemplate } = await import("./email-templates");
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
  const { contactFormTemplate } = await import("./email-templates");
  const html = contactFormTemplate(data);

  return sendEmail({
    to: FROM_ADDRESS,
    subject: `Liên hệ mới từ ${data.name || data.email} — 9Trip`,
    html,
  });
}

/**
 * Send password reset email with reset link.
 * @param {string} to - Recipient email
 * @param {string} resetLink - Password reset link
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendPasswordReset(to, resetLink) {
  const { passwordResetTemplate } = await import("./email-templates");
  const html = passwordResetTemplate(resetLink);

  return sendEmail({
    to,
    subject: "Đặt lại mật khẩu — 9 Trip Phú Quốc",
    html,
  });
}
