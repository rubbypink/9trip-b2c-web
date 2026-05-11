/**
 * GET /api/cron/cleanup-bookings
 * Cancel pending bookings older than 60 minutes.
 * Replaced by Firebase scheduled function: cleanupExpiredHolds.
 * @deprecated This route is for local dev only. Production uses Cloud Functions.
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendCancellationConfirmation } from '@/lib/email';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 60 * 60 * 1000);
    const cutoffISO = cutoff.toISOString();

    const snap = await adminDb.collection('bookings')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', cutoffISO)
      .get();

    if (snap.empty) {
      return NextResponse.json({ success: true, cleanedUp: 0 });
    }

    let cleanedUp = 0;
    const batch = adminDb.batch();

    for (const doc of snap.docs) {
      const booking = { id: doc.id, ...doc.data() };
      batch.update(doc.ref, {
        status: 'canceled',
        cancelledAt: now.toISOString(),
        cancellationReason: 'Hết thời gian thanh toán (60 phút)',
        updatedAt: now.toISOString(),
      });
      cleanedUp++;

      sendCancellationConfirmation(booking, 'Hết thời gian thanh toán (60 phút)')
        .catch(err => logger.error('[Cron] Email failed:', err.message));
    }

    await batch.commit();

    return NextResponse.json({ success: true, cleanedUp });
  } catch (error) {
    logger.error('[CRON_CLEANUP_ERROR]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
