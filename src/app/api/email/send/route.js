/**
 * Generic Email Send — API Route
 * POST /api/email/send
 *
 * Accepts { template, data } and sends the appropriate email.
 * Available templates: booking-confirmation, payment-confirmation, payment-failed,
 *   cancellation, contact-form, password-reset
 */

import { NextResponse } from "next/server";
import {
  sendBookingConfirmation,
  sendPaymentConfirmation,
  sendPaymentFailed,
  sendCancellationConfirmation,
  sendContactNotification,
  sendPasswordReset,
  sendPasswordChangedEmail,
} from "@/lib/email";
import { logger } from "@/lib/logger";

/** @type {Object<string, Function>} */
const TEMPLATE_HANDLERS = {
  "booking-confirmation": (data) => sendBookingConfirmation(data.booking),
  "payment-confirmation": (data) => sendPaymentConfirmation(data.booking),
  "payment-failed": (data) => sendPaymentFailed(data.booking),
  cancellation: (data) => sendCancellationConfirmation(data.booking, data.reason),
  "contact-form": (data) => sendContactNotification(data),
  "password-reset": (data) => sendPasswordReset(data.to, data.resetLink),
  "password-changed": (data) => sendPasswordChangedEmail(data.to, data.userName),
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { template, data } = body;

    if (!template || !data) {
      return NextResponse.json({ error: "Missing template or data" }, { status: 400 });
    }

    const handler = TEMPLATE_HANDLERS[template];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown template: ${template}. Available: ${Object.keys(TEMPLATE_HANDLERS).join(", ")}` },
        { status: 400 }
      );
    }

    const result = await handler(data);

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    }

    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  } catch (err) {
    logger.error("[Email Send] Error:", err.message);
    return NextResponse.json(
      { error: "Không thể gửi email. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
