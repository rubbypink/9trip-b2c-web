import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@9trip/shared/logger';

/**
 * Payment gateway webhook handler.
 * Receives callbacks from VNPay, MoMo, PayPal after payment completion.
 * Verifies payment status and updates booking in Firestore.
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { transactionId, bookingId, status, gateway } = body || {};

    if (!transactionId || !bookingId || !status || !gateway) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: transactionId, bookingId, status, gateway' },
        { status: 400 }
      );
    }

    if (status !== 'success' && status !== 'failed' && status !== 'cancelled') {
      return NextResponse.json(
        { success: false, message: 'Invalid status value' },
        { status: 400 }
      );
    }

    const bookingRef = adminDb.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingSnap.data();

    if (booking.payment && booking.payment.transactionId === transactionId) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    const updateData = {
      'payment.status': status,
      'payment.transactionId': transactionId,
      'payment.date': new Date().toISOString(),
      'payment.gate': gateway.toUpperCase(),
      updatedAt: new Date().toISOString(),
    };

    if (status === 'success') {
      updateData.status = 'paid';
    } else if (status === 'cancelled') {
      updateData.status = 'cancelled';
    }

    await bookingRef.update(updateData);

    return NextResponse.json({ success: true, message: 'Payment status updated' });
  } catch (error) {
    logger.error('[payments/webhook] Error:', error.message);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
