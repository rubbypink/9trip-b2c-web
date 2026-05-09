/**
 * POST /api/bookings/[id]/cancel
 * Cancel a booking. Emails are handled by Firebase Cloud Functions.
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const bookingRef = adminDb.collection('bookings').doc(id);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingSnap.data();

    if (booking.bookingStatus === 'cancelled') {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    await bookingRef.update({
      bookingStatus: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason || 'Không có lý do',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('[Cancel] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}