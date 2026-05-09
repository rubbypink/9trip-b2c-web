import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

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
    
    let newSubtotal = 0;
    Object.values(updatedItems).forEach(item => {
      newSubtotal += item.total || 0;
    });
    
    const newTax = newSubtotal * 0.08; 
    const newTotal = newSubtotal + newTax - (booking.pricing?.discount || 0);

    const updatedPricing = {
      ...booking.pricing,
      subtotal: newSubtotal,
      tax: newTax,
      total: Math.max(0, newTotal)
    };

    const updateData = {
      items: updatedItems,
      pricing: updatedPricing,
      updatedAt: new Date().toISOString()
    };
    
    if (Object.keys(updatedItems).length === 0) {
      updateData.bookingStatus = 'cancelled';
    }

    await bookingRef.update(updateData);

    return NextResponse.json({ success: true, updatedPricing, isCancelled: Object.keys(updatedItems).length === 0 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
