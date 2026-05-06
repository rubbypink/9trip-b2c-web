/**
 * Legacy Payment Return endpoint — migrated to /webhooks/payment.
 * Kept for backward compatibility — redirects all requests to new webhook.
 */
import { NextResponse } from 'next/server';

export async function GET(request) {
  const url = new URL(request.url);
  const params = url.searchParams.toString();
  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://9tripphuquoc.com'}/webhooks/payment${params ? '?' + params : ''}`;
  return NextResponse.redirect(redirectUrl, { status: 307 });
}