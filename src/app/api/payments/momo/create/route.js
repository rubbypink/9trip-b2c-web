/**
 * MoMo Payment Creation — API Route
 * POST /api/payments/momo/create
 *
 * Creates a booking document with pending status, calls MoMo API,
 * returns the payment URL for the client to redirect.
 */

import { NextResponse } from "next/server";
import { createMomoPayment } from "@/lib/payments/momo";
import { createBooking } from "@/lib/firestore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { bookingData, orderInfo } = body;

    if (!bookingData || !bookingData.userId || !bookingData.serviceId) {
      return NextResponse.json({ error: "Missing required booking data" }, { status: 400 });
    }

    // 1. Create booking with pending status
    const bookingId = await createBooking(bookingData);
    const bookingCode = bookingData.bookingCode || `9T-${Date.now().toString(36).toUpperCase()}`;

    // 2. Calculate amount
    const amount = bookingData.pricing?.total || bookingData.pricing?.grandTotal || 0;

    // 3. Create MoMo payment
    const result = await createMomoPayment({
      bookingId,
      amount,
      bookingCode,
      orderInfo: orderInfo || `Thanh toan ${bookingCode}`,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      bookingId,
      paymentUrl: result.payUrl,
      qrCodeUrl: result.qrCodeUrl,
      deeplink: result.deeplink,
    });
  } catch (err) {
    console.error("[MoMo Create] Error:", err.message);
    return NextResponse.json(
      { error: "Không thể tạo thanh toán MoMo. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
