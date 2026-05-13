import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.orderId || !body.amount) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    return NextResponse.json({ success: true, paymentId: "mock-payment-id" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}