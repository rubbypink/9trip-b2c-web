/**
 * PayPal Order Capture — API Route
 * POST /api/payments/paypal/capture
 *
 * Called after user approves payment on PayPal.
 * Captures the order and updates booking status to paid.
 */

import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/payments/paypal";
import { updateBooking } from "@/lib/firestore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, bookingId } = body;

    if (!orderId || !bookingId) {
      return NextResponse.json({ error: "Missing orderId or bookingId" }, { status: 400 });
    }

    // 1. Capture the PayPal order
    const result = await capturePayPalOrder(orderId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    // 2. Update booking status to paid
    await updateBooking(bookingId, {
      paymentStatus: "paid",
      bookingStatus: "confirmed",
      transactionId: result.captureId,
      paymentGateway: "paypal",
      paidAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      bookingId,
      captureId: result.captureId,
      amount: result.amount,
      currency: result.currency,
    });
  } catch (err) {
    console.error("[PayPal Capture] Error:", err.message);
    return NextResponse.json(
      { error: "Không thể xác nhận thanh toán PayPal. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
