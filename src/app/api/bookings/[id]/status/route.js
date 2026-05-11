/**
 * Booking Status API Route
 * GET /api/bookings/[id]/status
 *
 * Returns the current payment status of a booking.
 * Used by the return page to poll for IPN results.
 */

import { NextResponse } from "next/server";
import { getBookingById } from "@/lib/firestore-admin";
import { logger } from "@/lib/logger";

/**
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
    }

    const booking = await getBookingById(id);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({
      bookingId: id,
      status: booking.status || "pending",
      payment: booking.payment || null,
    });
  } catch (err) {
    logger.error("[BookingStatus] Error:", err.message);
    return NextResponse.json({ error: "Failed to fetch booking status" }, { status: 500 });
  }
}
