/**
 * API Route for handling payment webhooks from multiple gateways.
 * Path: /api/webhooks/payment
 *
 * Handles:
 *   - VNPay IPN (GET with query params)
 *   - MoMo IPN (POST with JSON body)
 *   - PayPal Webhook (POST with JSON body)
 *
 * After processing, sends confirmation/failure emails to the customer.
 */

import { NextResponse } from "next/server";
import { normalizePaymentPayload, verifyWebhookSignature } from "@/lib/payments/utils";
import { verifyVNPayIPN } from "@/lib/payments/vnpay";
import { updateBooking, releaseInventoryHold, getBookingById } from "@/lib/firestore";
import { sendPaymentConfirmation, sendBookingConfirmation, sendPaymentFailed } from "@/lib/email";

/**
 * Handle VNPay IPN (Instant Payment Notification) — GET with query params.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const gateway = searchParams.get("gateway");

  if (gateway !== "vnpay") {
    return NextResponse.json({ error: "GET only supported for VNPay IPN" }, { status: 400 });
  }

  try {
    // Collect all query params
    const params = {};
    searchParams.forEach((val, key) => {
      params[key] = val;
    });

    // Verify VNPay signature
    const result = verifyVNPayIPN(params);
    if (!result.valid) {
      return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
    }

    if (!result.bookingId) {
      return NextResponse.json({ RspCode: "01", Message: "Missing booking ID" });
    }

    // Get booking and update
    const booking = await getBookingById(result.bookingId);
    if (!booking) {
      return NextResponse.json({ RspCode: "01", Message: "Booking not found" });
    }

    if (result.isSuccess) {
      await updateBooking(result.bookingId, {
        paymentStatus: "paid",
        bookingStatus: "confirmed",
        transactionId: result.transactionId,
        paymentGateway: "vnpay",
        paidAt: new Date(),
      });

      // Release hold
      if (booking.inventoryHoldId) {
        await releaseInventoryHold(booking.inventoryHoldId);
      }

      // Send confirmation emails (fire-and-forget)
      const updatedBooking = { ...booking, paymentStatus: "paid", paymentGateway: "vnpay", transactionId: result.transactionId };
      sendBookingConfirmation(updatedBooking).catch(() => {});
      sendPaymentConfirmation(updatedBooking).catch(() => {});
    } else {
      await updateBooking(result.bookingId, { paymentStatus: "failed" });

      const failedBooking = { ...booking, paymentStatus: "failed" };
      sendPaymentFailed(failedBooking).catch(() => {});
    }

    // VNPay expects these response codes
    return NextResponse.json({ RspCode: "00", Message: "Success" });
  } catch (err) {
    console.error(`[VNPay IPN] Error:`, err.message);
    return NextResponse.json({ RspCode: "99", Message: "Unknown error" });
  }
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const gateway = searchParams.get("gateway"); // e.g., ?gateway=momo

  if (!gateway) {
    return NextResponse.json({ error: "Missing gateway parameter" }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // 1. Verify Signature
    const isValid = await verifyWebhookSignature(gateway, request, rawBody);
    if (!isValid) {
      console.warn(`[Webhook] Invalid signature from ${gateway}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Normalize Data
    const normalized = normalizePaymentPayload(gateway, payload);
    if (!normalized || !normalized.bookingId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 3. Get Booking
    const booking = await getBookingById(normalized.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // 4. Update Booking Status
    if (normalized.status === "paid") {
      await updateBooking(normalized.bookingId, {
        paymentStatus: "paid",
        bookingStatus: "confirmed",
        transactionId: normalized.transactionId,
        paymentGateway: gateway,
        paidAt: new Date(),
      });

      // 5. Release Inventory Hold if applicable
      if (booking.inventoryHoldId) {
        await releaseInventoryHold(booking.inventoryHoldId);
      }

      // 6. Send confirmation emails (fire-and-forget — don't block response)
      const updatedBooking = {
        ...booking,
        paymentStatus: "paid",
        paymentGateway: gateway,
        transactionId: normalized.transactionId,
        paidAt: new Date().toISOString(),
      };
      sendBookingConfirmation(updatedBooking).catch((e) => console.error("[Email] Booking conf failed:", e));
      sendPaymentConfirmation(updatedBooking).catch((e) => console.error("[Email] Payment conf failed:", e));
    } else if (normalized.status === "failed") {
      await updateBooking(normalized.bookingId, {
        paymentStatus: "failed",
      });

      // Send failure notification
      const failedBooking = { ...booking, paymentStatus: "failed" };
      sendPaymentFailed(failedBooking).catch((e) => console.error("[Email] Payment failed notify:", e));
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Webhook Error [${gateway}]:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
