import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json({ success: false, message: "Missing or invalid items" }, { status: 400 });
    }

    return NextResponse.json({ success: true, valid: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}