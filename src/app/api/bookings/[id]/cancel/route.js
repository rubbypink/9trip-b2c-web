/**
 * POST /api/bookings/[id]/cancel
 * Cancel a booking and send cancellation confirmation email.
 */
import { NextResponse } from 'next/server';
import { sendCancellationConfirmation } from '@/lib/email';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

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

    if (booking.status === 'canceled') {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    await bookingRef.update({
      status: 'canceled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason || 'Không có lý do',
      updatedAt: new Date().toISOString(),
    });

    const fullBooking = { id, ...booking, status: 'canceled', cancellationReason: reason || 'Không có lý do' };
    sendCancellationConfirmation(fullBooking, reason || 'Không có lý do').catch(err =>
      logger.error('[Cancel] Cancellation email failed:', err.message)
    );

    return NextResponse.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    logger.error('[Cancel] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}