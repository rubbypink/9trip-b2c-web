import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.holdId) {
      return NextResponse.json({ success: false, message: "Missing holdId" }, { status: 400 });
    }

    return NextResponse.json({ success: true, released: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}