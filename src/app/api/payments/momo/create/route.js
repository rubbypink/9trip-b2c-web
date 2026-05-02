/**
 * MoMo Payment Creation — API Route (Proxy)
 * POST /api/payments/momo/create
 *
 * Creates a booking document with pending status, then proxies the MoMo API
 * call to Cloud Functions (MoMo requires 30s timeout > Vercel Hobby 10s).
 * Returns the payment URL for the client to redirect.
 */

import { NextResponse } from "next/server";
import { createBooking } from "@/lib/firestore";

const CLOUD_FUNCTION_URL = process.env.CLOUD_FUNCTION_URL || "https://asia-southeast1-tripphuquoc-db-fs.cloudfunctions.net";

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

    // 3. Proxy to Cloud Function (bypasses Vercel Hobby 10s timeout)
    const cfResponse = await fetch(`${CLOUD_FUNCTION_URL}/createMomoPayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        amount,
        bookingCode,
        orderInfo: orderInfo || `Thanh toan ${bookingCode}`,
      }),
      signal: AbortSignal.timeout(35000), // 35s (CF has 30s for MoMo + buffer)
    });

    const result = await cfResponse.json();

    if (!cfResponse.ok || result.error) {
      return NextResponse.json(
        { error: result.error || result.message || "MoMo payment creation failed" },
        { status: 502 }
      );
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
