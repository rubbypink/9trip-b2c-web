import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.email || (!body.userName && !body.name)) {
      return NextResponse.json({ success: false, message: "Missing email or userName" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Welcome email sent" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}