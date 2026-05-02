/**
 * Payment Log API Route
 * POST /api/payments/log
 *
 * Receives payment event logs from the client and stores them in Firestore.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { gateway, bookingId, event, request: reqData, response: resData, error, timestamp } = body;

    if (!gateway || !event) {
      return NextResponse.json({ error: "Missing gateway or event" }, { status: 400 });
    }

    const db_ = db;
    await addDoc(collection(db_, "payment_logs"), {
      gateway,
      bookingId: bookingId || "unknown",
      event,
      request: reqData || null,
      response: resData || null,
      error: error || null,
      timestamp: timestamp || new Date().toISOString(),
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PaymentLog] Failed to write:", err.message);
    return NextResponse.json({ error: "Failed to log payment event" }, { status: 500 });
  }
}
