import { NextResponse } from 'next/server';
import { sendBookingConfirmation } from '@9trip/shared/email/service';
import { logger } from '@9trip/shared/logger';

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
      logger.error('[Booking Email] Failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (err) {
    logger.error('[Booking Email] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
