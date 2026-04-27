/**
 * API Route for handling payment webhooks from multiple gateways.
 * Path: /api/webhooks/payment
 */

import { NextResponse } from "next/server";
import { normalizePaymentPayload, verifyWebhookSignature } from "@/lib/payments/utils";
import { updateBooking, releaseInventoryHold, getBookingById } from "@/lib/firestore";

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const gateway = searchParams.get("gateway"); // e.g., ?gateway=stripe
  
  if (!gateway) {
    return NextResponse.json({ error: "Missing gateway parameter" }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // 1. Verify Signature
    const isValid = await verifyWebhookSignature(gateway, request, rawBody);
    if (!isValid) {
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
      
      // Note: ERP Sync would usually be triggered here or via Firestore Function
    } else if (normalized.status === "failed") {
      await updateBooking(normalized.bookingId, {
        paymentStatus: "failed",
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Webhook Error [${gateway}]:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
