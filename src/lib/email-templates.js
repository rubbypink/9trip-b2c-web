/**
 * Email HTML Templates — Vietnamese, responsive, branded.
 *
 * All templates return an HTML string. Uses inline styles for email client compatibility.
 * Includes 9 Trip branding: logo, colors (#0ea5e9 primary), footer with contact info.
 */

import { SITE, COMPANY } from "./constants";
import { formatCurrency, formatDate } from "./utils";

const PRIMARY = "#0ea5e9";
const DARK = "#1e293b";
const LIGHT_BG = "#f8fafc";
const TEXT = "#334155";
const MUTED = "#94a3b8";
const WHITE = "#ffffff";
const SUCCESS = "#16a34a";
const DANGER = "#dc2626";

const LOGO_URL = `${SITE.url}/images/logo.png`;
const SITE_NAME = SITE.name;

/**
 * Base layout wrapper for all email templates.
 * @param {{ title: string, content: string }} props
 * @returns {string} HTML string
 */
function baseLayout({ title, content }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${LIGHT_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${LIGHT_BG};padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${WHITE};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          ${headerTemplate(title)}
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>
          ${footerTemplate()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email header with logo + title bar.
 * @param {string} title
 * @returns {string}
 */
function headerTemplate(title) {
  return `<tr>
    <td style="background-color:${PRIMARY};padding:24px 40px;text-align:center;">
      <h1 style="color:${WHITE};font-size:18px;font-weight:700;margin:0;line-height:1.4;">${title}</h1>
    </td>
  </tr>`;
}

/**
 * Email footer with company info.
 * @returns {string}
 */
function footerTemplate() {
  return `<tr>
    <td style="background-color:${LIGHT_BG};padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="font-size:12px;color:${MUTED};margin:0 0 8px 0;">
        &copy; ${new Date().getFullYear()} ${SITE_NAME} — ${SITE.tagline}
      </p>
      <p style="font-size:11px;color:${MUTED};margin:0 0 4px 0;">
        &#128231; ${SITE.email} &nbsp;|&nbsp; &#128222; ${SITE.phone}
      </p>
      <p style="font-size:11px;color:${MUTED};margin:0;">
        ${COMPANY.address}
      </p>
      <p style="font-size:10px;color:#cbd5e1;margin:12px 0 0 0;">
        Email này được gửi tự động. Vui lòng không trả lời trực tiếp.
      </p>
    </td>
  </tr>`;
}

/**
 * Info row helper (label + value).
 * @param {string} label
 * @param {string} value
 * @returns {string}
 */
function infoRow(label, value) {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:${MUTED};width:140px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:${DARK};font-weight:500;">${value}</td>
  </tr>`;
}

/**
 * Status badge.
 * @param {string} text
 * @param {string} color - hex color
 * @param {string} bg - hex background
 * @returns {string}
 */
function badge(text, color = SUCCESS, bg = "#dcfce7") {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;color:${color};background-color:${bg};">${text}</span>`;
}

/**
 * Booking confirmation email template.
 * @param {Object} booking
 * @returns {string}
 */
export function bookingConfirmationTemplate(booking) {
  const statusText = booking.paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán";
  const statusColor = booking.paymentStatus === "paid" ? SUCCESS : "#f59e0b";
  const statusBg = booking.paymentStatus === "paid" ? "#dcfce7" : "#fef3c7";

  const content = `
    <p style="font-size:15px;color:${TEXT};line-height:1.6;margin:0 0 8px 0;">
      Xin chào <strong>${booking.contactInfo?.fullName || "Quý khách"}</strong>,
    </p>
    <p style="font-size:14px;color:${TEXT};line-height:1.6;margin:0 0 20px 0;">
      Cảm ơn bạn đã đặt dịch vụ tại <strong>${SITE_NAME}</strong>. Dưới đây là thông tin đơn hàng của bạn:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${LIGHT_BG};border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoRow("Mã đơn hàng", `<strong style="font-size:16px;">${booking.bookingCode || booking.id}</strong>`)}
            ${infoRow("Trạng thái", badge(statusText, statusColor, statusBg))}
            ${infoRow("Ngày đặt", formatDate(booking.createdAt || new Date()))}
            ${infoRow("Phương thức TT", (booking.paymentGateway || "N/A").toUpperCase())}
          </table>
        </td>
      </tr>
    </table>

    <h3 style="font-size:15px;color:${DARK};margin:20px 0 12px 0;font-weight:700;">Chi tiết dịch vụ</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${LIGHT_BG};border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoRow("Loại dịch vụ", booking.serviceType || "N/A")}
            ${infoRow("Ngày bắt đầu", formatDate(booking.startDate))}
            ${booking.endDate ? infoRow("Ngày kết thúc", formatDate(booking.endDate)) : ""}
            ${infoRow("Khách", `${booking.guests?.adults || 0} người lớn${booking.guests?.children > 0 ? `, ${booking.guests.children} trẻ em` : ""}`)}
          </table>
        </td>
      </tr>
    </table>

    <h3 style="font-size:15px;color:${DARK};margin:20px 0 12px 0;font-weight:700;">Thanh toán</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${LIGHT_BG};border-radius:8px;padding:16px;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoRow("Tạm tính", formatCurrency(booking.pricing?.subtotal))}
            ${booking.pricing?.discount > 0 ? infoRow("Giảm giá", `-${formatCurrency(booking.pricing.discount)}`) : ""}
            ${infoRow("Thuế (10%)", formatCurrency(booking.pricing?.tax))}
            <tr>
              <td colspan="2" style="padding-top:10px;border-top:2px solid #e2e8f0;">
                <table width="100%"><tr>
                  <td style="font-size:15px;color:${DARK};font-weight:700;">Tổng cộng</td>
                  <td align="right" style="font-size:18px;color:${PRIMARY};font-weight:700;">${formatCurrency(booking.pricing?.total)}</td>
                </tr></table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="font-size:14px;color:${TEXT};line-height:1.6;margin:0 0 8px 0;">
      Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua:
    </p>
    <p style="font-size:14px;color:${TEXT};line-height:1.6;margin:0;">
      &#128231; <a href="mailto:${SITE.email}" style="color:${PRIMARY};">${SITE.email}</a> &nbsp;|&nbsp; &#128222; <a href="tel:${SITE.phone}" style="color:${PRIMARY};">${SITE.phone}</a>
    </p>
  `;

  return baseLayout({ title: `Xác nhận đặt chỗ #${booking.bookingCode || booking.id}`, content });
}

/**
 * Payment confirmation email template.
 * @param {Object} booking
 * @returns {string}
 */
export function paymentConfirmationTemplate(booking) {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background-color:#dcfce7;border-radius:50%;display:inline-block;line-height:56px;font-size:28px;">&#10003;</div>
    </div>
    <p style="font-size:16px;color:${DARK};text-align:center;font-weight:700;margin:0 0 8px 0;">
      Thanh toán thành công!
    </p>
    <p style="font-size:14px;color:${TEXT};text-align:center;line-height:1.6;margin:0 0 20px 0;">
      Đơn hàng <strong>#${booking.bookingCode || booking.id}</strong> đã được thanh toán thành công.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#dcfce7;border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoRow("Mã giao dịch", booking.transactionId || "N/A")}
            ${infoRow("Số tiền", `<strong>${formatCurrency(booking.pricing?.total)}</strong>`)}
            ${infoRow("Cổng thanh toán", (booking.paymentGateway || "").toUpperCase())}
            ${infoRow("Thời gian", formatDate(booking.paidAt || new Date()))}
          </table>
        </td>
      </tr>
    </table>

    <p style="font-size:13px;color:${MUTED};line-height:1.5;margin:0;">
      Chúng tôi sẽ sớm liên hệ để xác nhận lịch trình chi tiết. Bạn có thể xem trạng thái đơn hàng trong tài khoản của mình.
    </p>
  `;

  return baseLayout({ title: "Thanh toán thành công", content });
}

/**
 * Payment failed email template.
 * @param {Object} booking
 * @returns {string}
 */
export function paymentFailedTemplate(booking) {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background-color:#fee2e2;border-radius:50%;display:inline-block;line-height:56px;font-size:28px;">&#10007;</div>
    </div>
    <p style="font-size:16px;color:${DANGER};text-align:center;font-weight:700;margin:0 0 8px 0;">
      Thanh toán thất bại
    </p>
    <p style="font-size:14px;color:${TEXT};text-align:center;line-height:1.6;margin:0 0 20px 0;">
      Rất tiếc, thanh toán cho đơn hàng <strong>#${booking.bookingCode || booking.id}</strong> không thành công.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${SITE.url}/checkout" style="display:inline-block;padding:12px 32px;background-color:${PRIMARY};color:${WHITE};text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">
            Thử thanh toán lại
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size:13px;color:${MUTED};line-height:1.5;margin:0;">
      Nếu bạn cần hỗ trợ, vui lòng liên hệ &#128231; <a href="mailto:${SITE.email}" style="color:${PRIMARY};">${SITE.email}</a> hoặc gọi &#128222; ${SITE.phone}.
    </p>
  `;

  return baseLayout({ title: "Thanh toán thất bại", content });
}

/**
 * Cancellation confirmation email template.
 * @param {Object} booking
 * @param {string} [reason]
 * @returns {string}
 */
export function cancellationTemplate(booking, reason) {
  const content = `
    <p style="font-size:15px;color:${TEXT};line-height:1.6;margin:0 0 8px 0;">
      Xin chào <strong>${booking.contactInfo?.fullName || "Quý khách"}</strong>,
    </p>
    <p style="font-size:14px;color:${TEXT};line-height:1.6;margin:0 0 20px 0;">
      Đơn hàng <strong>#${booking.bookingCode || booking.id}</strong> của bạn đã được hủy theo yêu cầu.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${LIGHT_BG};border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoRow("Mã đơn hàng", booking.bookingCode || booking.id)}
            ${infoRow("Dịch vụ", booking.serviceType || "N/A")}
            ${infoRow("Ngày", formatDate(booking.startDate))}
            ${reason ? infoRow("Lý do hủy", reason) : ""}
          </table>
        </td>
      </tr>
    </table>

    <p style="font-size:13px;color:${MUTED};line-height:1.5;margin:0;">
      Tiền hoàn (nếu có) sẽ được xử lý trong vòng 7-14 ngày làm việc. Nếu có thắc mắc, vui lòng liên hệ &#128222; ${SITE.phone}.
    </p>
  `;

  return baseLayout({ title: "Xác nhận hủy đơn hàng", content });
}

/**
 * Contact form notification to admin.
 * @param {{ name: string, email: string, phone: string, message: string, subject?: string }} data
 * @returns {string}
 */
export function contactFormTemplate(data) {
  const content = `
    <p style="font-size:15px;color:${TEXT};line-height:1.6;margin:0 0 20px 0;">
      Có một liên hệ mới từ website.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${LIGHT_BG};border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${infoRow("Họ tên", data.name || "N/A")}
            ${infoRow("Email", data.email || "N/A")}
            ${infoRow("Điện thoại", data.phone || "N/A")}
            ${data.subject ? infoRow("Tiêu đề", data.subject) : ""}
          </table>
        </td>
      </tr>
    </table>

    <h3 style="font-size:14px;color:${DARK};margin:16px 0 8px 0;font-weight:700;">Nội dung tin nhắn</h3>
    <div style="background-color:${LIGHT_BG};border-radius:8px;padding:16px;font-size:14px;color:${TEXT};line-height:1.6;white-space:pre-wrap;">
      ${data.message || ""}
    </div>
  `;

  return baseLayout({ title: "Liên hệ mới từ website", content });
}

/**
 * Password reset email with link.
 * @param {string} resetLink
 * @returns {string}
 */
export function passwordResetTemplate(resetLink) {
  const content = `
    <p style="font-size:15px;color:${TEXT};line-height:1.6;margin:0 0 8px 0;">
      Xin chào,
    </p>
    <p style="font-size:14px;color:${TEXT};line-height:1.6;margin:0 0 20px 0;">
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>${SITE_NAME}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${resetLink}" style="display:inline-block;padding:12px 32px;background-color:${PRIMARY};color:${WHITE};text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">
            Đặt lại mật khẩu
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size:13px;color:${MUTED};line-height:1.5;margin:0 0 4px 0;">
      Liên kết này sẽ hết hạn sau 1 giờ.
    </p>
    <p style="font-size:13px;color:${MUTED};line-height:1.5;margin:0;">
      Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
    </p>
  `;

  return baseLayout({ title: "Đặt lại mật khẩu", content });
}
