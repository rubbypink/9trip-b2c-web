import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.gateway || !body.amount || !body.bookingData) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      url: `http://mock-payment.local/pay?gateway=${body.gateway}&amount=${body.amount}`,
      bookingId: `mock-booking-${Date.now()}`
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}