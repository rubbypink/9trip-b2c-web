import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json({ success: false, message: "Missing or invalid items" }, { status: 400 });
    }

    // Mock calculation based on items
    const grandTotal = body.items.reduce((sum, item) => sum + (item.total || 0), 0);

    return NextResponse.json({ 
      success: true, 
      pricing: {
        subtotal: grandTotal,
        tax: 0,
        discount: 0,
        grandTotal: grandTotal,
        currency: "VND"
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}