/**
 * Payment Log API Route
 * POST /api/payments/log
 *
 * Receives payment event logs from the client and stores them in Firestore.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

export async function POST(request) {
  try {
    const body = await request.json();
    const { gateway, bookingId, event, request: reqData, response: resData, error, timestamp } = body;

    if (!gateway || !event) {
      return NextResponse.json({ error: "Missing gateway or event" }, { status: 400 });
    }

    await adminDb.collection("payment_logs").add({
      gateway,
      bookingId: bookingId || "unknown",
      event,
      request: reqData || null,
      response: resData || null,
      error: error || null,
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[PaymentLog] Failed to write:", err.message);
    return NextResponse.json({ error: "Failed to log payment event" }, { status: 500 });
  }
}
