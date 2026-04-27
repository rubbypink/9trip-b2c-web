/**
 * VNPay Payment Creation — API Route
 * POST /api/payments/vnpay/create
 *
 * Creates a booking document with pending status, then returns the VNPay payment URL.
 * The client redirects the user to this URL for payment.
 */

import { NextResponse } from "next/server";
import { buildVNPayUrl } from "@/lib/payments/vnpay";
import { createBooking } from "@/lib/firestore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { bookingData, ipAddr } = body;

    if (!bookingData || !bookingData.userId || !bookingData.serviceId) {
      return NextResponse.json({ error: "Missing required booking data" }, { status: 400 });
    }

    // 1. Create booking with pending status
    const bookingId = await createBooking(bookingData);
    const bookingCode = `9T-${Date.now().toString(36).toUpperCase()}`;

    // 2. Calculate amount (use grand total from booking data)
    const amount = bookingData.pricing?.total || bookingData.pricing?.grandTotal || 0;

    // 3. Build VNPay payment URL
    const paymentUrl = buildVNPayUrl({
      bookingId,
      amount,
      bookingCode: bookingData.bookingCode || bookingCode,
      ipAddr: ipAddr || request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      bookingId,
      paymentUrl,
    });
  } catch (err) {
    console.error("[VNPay Create] Error:", err.message);
    return NextResponse.json(
      { error: "Không thể tạo thanh toán VNPay. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
