/**
 * Email notification functions.
 * Sends booking confirmation and payment receipt emails using Nodemailer.
 */

const nodemailer = require("nodemailer");

/**
 * Create email transporter.
 * Configure SMTP via environment variables.
 * @returns {nodemailer.Transporter}
 */
function createTransporter() {
  // In production, use real SMTP credentials
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: log to console in development
  console.warn("[email] No SMTP configured — emails will be logged only");
  return {
    sendMail: async (mailOptions) => {
      console.log("[email] Would send:", {
        to: mailOptions.to,
        subject: mailOptions.subject,
      });
      return { messageId: "dev-" + Date.now() };
    },
  };
}

/**
 * Format currency for display in emails.
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
function formatCurrency(amount, currency = "VND") {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Send booking confirmation email.
 * @param {FirebaseFirestore.Firestore} db
 * @param {Object} booking
 * @param {string} bookingId
 */
async function sendBookingConfirmation(db, booking, bookingId) {
  const transporter = createTransporter();

  const userEmail = booking.userEmail || booking.email;
  if (!userEmail) {
    console.warn(`[email] No email for booking ${bookingId}, skipping`);
    return;
  }

  const subject = `Xác nhận đặt dịch vụ #${booking.bookingCode || bookingId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #3b82f6; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">9 Trip Phú Quốc</h2>
      </div>
      <div style="padding: 20px; background: #f9fafb;">
        <h3>Xin chào ${booking.userName || "Quý khách"},</h3>
        <p>Cảm ơn bạn đã đặt dịch vụ tại 9 Trip Phú Quốc. Dưới đây là thông tin đặt dịch vụ của bạn:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Mã đặt dịch vụ:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.bookingCode || bookingId}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Dịch vụ:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.serviceName || booking.type || "—"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Tổng tiền:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${formatCurrency(booking.totalAmount || 0, booking.currency || "VND")}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Trạng thái:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}</td></tr>
        </table>
        <p>Vui lòng kiểm tra lại thông tin và liên hệ chúng tôi nếu có bất kỳ sai sót nào.</p>
        <p>Hotline: 0877901901 | Email: info@9tripphuquoc.com</p>
      </div>
      <div style="background: #1f2937; padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © 2026 Công ty TNHH 9 Trip Phú Quốc. Tất cả quyền được bảo lưu.<br/>
          17 Chu Văn An, Khu Phố 5, đặc khu Phú Quốc, An Giang
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"9 Trip Phú Quốc" <${process.env.SMTP_FROM || "info@9tripphuquoc.com"}>`,
      to: userEmail,
      subject,
      html,
    });
    console.log(`[email] Booking confirmation sent to ${userEmail} for #${bookingId}`);
  } catch (err) {
    console.error(`[email] Failed to send confirmation for #${bookingId}:`, err);
    throw err;
  }
}

/**
 * Send payment receipt email when booking is paid.
 * @param {FirebaseFirestore.Firestore} db
 * @param {Object} booking
 * @param {string} bookingId
 */
async function sendPaymentReceipt(db, booking, bookingId) {
  const transporter = createTransporter();

  const userEmail = booking.userEmail || booking.email;
  if (!userEmail) {
    console.warn(`[email] No email for booking ${bookingId}, skipping receipt`);
    return;
  }

  const subject = `Thanh toán thành công — Đặt dịch vụ #${booking.bookingCode || bookingId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #10b981; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">✅ Thanh toán thành công</h2>
      </div>
      <div style="padding: 20px; background: #f9fafb;">
        <h3>Xin chào ${booking.userName || "Quý khách"},</h3>
        <p>Chúng tôi đã nhận được thanh toán cho đặt dịch vụ của bạn:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Mã đặt dịch vụ:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.bookingCode || bookingId}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Số tiền:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${formatCurrency(booking.paidAmount || booking.totalAmount || 0, booking.currency || "VND")}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Mã giao dịch:</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.transactionId || "—"}</td></tr>
        </table>
        <p>Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của 9 Trip Phú Quốc!</p>
      </div>
      <div style="background: #1f2937; padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © 2026 Công ty TNHH 9 Trip Phú Quốc
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"9 Trip Phú Quốc" <${process.env.SMTP_FROM || "info@9tripphuquoc.com"}>`,
      to: userEmail,
      subject,
      html,
    });
    console.log(`[email] Payment receipt sent to ${userEmail} for #${bookingId}`);
  } catch (err) {
    console.error(`[email] Failed to send receipt for #${bookingId}:`, err);
    throw err;
  }
}

module.exports = { sendBookingConfirmation, sendPaymentReceipt };
