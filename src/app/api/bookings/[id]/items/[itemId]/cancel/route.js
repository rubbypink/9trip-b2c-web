import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * POST /api/bookings/[id]/items/[itemId]/cancel
 * Cancel a specific item in a booking, recalculate totals.
 */
export async function POST(request, { params }) {
  try {
    const { id, itemId } = await params;
    const bookingRef = adminDb.collection('bookings').doc(id);
    const bookingSnap = await bookingRef.get();
    
    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingSnap.data();
    if (!booking.items || !booking.items[itemId]) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updatedItems = { ...booking.items };
    delete updatedItems[itemId];
    
    const newTotal = Object.values(updatedItems).reduce((sum, item) => sum + (item.total || 0), 0);
    const newDeposit = Object.values(updatedItems).reduce((sum, item) => {
      return sum + (item.total || 0) * (item.prepaid || 0) / 100;
    }, 0);
    const newBalance = newTotal - newDeposit;

    const updateData = {
      items: updatedItems,
      'payment.total': Math.round(newTotal),
      'payment.deposit': Math.round(newDeposit),
      'payment.balance': Math.round(newBalance),
      updatedAt: new Date().toISOString()
    };
    
    if (Object.keys(updatedItems).length === 0) {
      updateData.status = 'canceled';
    }

    await bookingRef.update(updateData);

    return NextResponse.json({ success: true, updatedPricing, isCancelled: Object.keys(updatedItems).length === 0 });
  } catch (err) {
    logger.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
