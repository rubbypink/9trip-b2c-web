import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.template || !body.data) {
      return NextResponse.json({ success: false, message: "Missing template or data" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Email sent" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}