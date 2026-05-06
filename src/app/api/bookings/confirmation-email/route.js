import { NextResponse } from 'next/server';
import { sendBookingConfirmation } from '@/lib/email';

export async function POST(request) {
  try {
    const booking = await request.json();
    
    if (!booking || !booking.contactInfo?.email) {
      return NextResponse.json({ error: 'Invalid booking data' }, { status: 400 });
    }
    
    const result = await sendBookingConfirmation(booking);
    
    if (result.success) {
      console.log(`[Booking Email] Confirmation sent for booking ${booking.id || booking.bookingCode}`);
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      console.error('[Booking Email] Failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (err) {
    console.error('[Booking Email] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
