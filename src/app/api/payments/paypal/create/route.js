/**
 * PayPal Order Creation — API Route
 * POST /api/payments/paypal/create
 *
 * Creates a booking document with pending status, then calls PayPal REST API
 * to create an order. Returns the approval URL for client redirection.
 */

import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/payments/paypal";
import { createBooking } from "@/lib/firestore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { bookingData, currency, description } = body;

    if (!bookingData || !bookingData.userId || !bookingData.serviceId) {
      return NextResponse.json({ error: "Missing required booking data" }, { status: 400 });
    }

    // 1. Create booking with pending status
    const bookingId = await createBooking(bookingData);
    const bookingCode = bookingData.bookingCode || `9T-${Date.now().toString(36).toUpperCase()}`;

    // 2. Calculate amount (PayPal uses USD typically; VND if specified)
    const amount = bookingData.pricing?.total || bookingData.pricing?.grandTotal || 0;

    // 3. Create PayPal order
    const result = await createPayPalOrder({
      amount,
      currency: currency || "USD",
      bookingId,
      description: description || `Booking ${bookingCode}`,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      bookingId,
      orderId: result.orderId,
      approvalUrl: result.approvalUrl,
    });
  } catch (err) {
    console.error("[PayPal Create] Error:", err.message);
    return NextResponse.json(
      { error: "Không thể tạo thanh toán PayPal. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
