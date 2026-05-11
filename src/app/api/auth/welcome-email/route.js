/**
 * POST /api/auth/welcome-email
 * Send welcome email after successful registration.
 */
import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

export async function POST(request) {
  try {
    const { email, userName } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Send welcome email (fire-and-forget, but we await for response)
    const result = await sendWelcomeEmail(email, userName);
    
    if (result.success) {
      console.log(`[Welcome Email] Sent to ${email}`);
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      logger.error(`[Welcome Email] Failed to send to ${email}:`, result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (err) {
    logger.error('[Welcome Email] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
