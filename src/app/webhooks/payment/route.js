/**
 * Unified Payment Webhook — Return + IPN Handler
 *
 * GET  /webhooks/payment?gateway=vnpay|momo|paypal  — User redirect (return)
 * POST /webhooks/payment                              — Server-to-server (IPN)
 *
 * Gateway detection:
 *   - GET:  `gateway` query param
 *   - POST: `x-payment-gateway` header or body.gateway
 *
 * Flow:
 *   1. Verify signature with gateway-specific logic
 *   2. Update booking status → PAID
 *   3. Release inventory hold
 *   4. Forward to ERP (new-booking event)
 *   5. Redirect user to confirmation page (GET only)
 */

import { NextResponse } from 'next/server';
import { sendPaymentConfirmation, sendPaymentFailed } from '@/lib/email';
import { PaymentService } from '@/lib/payments/payment';
import { adminDb } from '@/lib/firebase-admin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://9tripphuquoc.com';
const ERP_WEBHOOK_URL = '/webhooks/erp';

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract all search params into a plain object.
 * @param {URL} url
 * @returns {Object}
 */
function paramsToObject(url) {
  const obj = {};
  for (const [key, value] of url.searchParams.entries()) {
    obj[key] = value;
  }
  return obj;
}

/**
 * Update booking after successful payment.
 * @param {string} bookingId
 * @param {string} transactionId
 * @param {string} gateway
 */
async function updateBookingAfterPayment(bookingId, transactionId, gateway) {
  try {
    await adminDb.collection('bookings').doc(bookingId).update({
      paymentStatus: 'PAID',
      bookingStatus: 'confirmed',
      transactionId: transactionId || '',
      paymentGateway: gateway,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`[Payment Webhook] ✅ Booking ${bookingId} updated to PAID`);
  } catch (error) {
    console.error(`[Payment Webhook] Failed to update booking ${bookingId}:`, error.message);
  }
}

/**
 * Release inventory hold for a booking.
 * @param {string} bookingId
 */
async function releaseInventoryHold(bookingId) {
  try {
    const snap = await adminDb.collection('inventory_holds')
      .where('serviceId', '==', bookingId)
      .limit(1)
      .get();
    if (!snap.empty) {
      await snap.docs[0].ref.delete();
      console.log(`[Payment Webhook] ✅ Inventory hold released for booking ${bookingId}`);
    }
  } catch (error) {
    console.error(`[Payment Webhook] Failed to release hold for ${bookingId}:`, error.message);
  }
}

/**
 * Forward booking event to ERP.
 * @param {string} bookingId
 */
async function forwardToERP(bookingId) {
  try {
    const snap = await adminDb.collection('bookings').doc(bookingId).get();
    if (!snap.exists) return;

    const forwardUrl = new URL(ERP_WEBHOOK_URL, SITE_URL);
    forwardUrl.searchParams.set('action', 'forward');
    forwardUrl.searchParams.set('event', 'new-booking');

    await fetch(forwardUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-erp-secret': process.env.ERP_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({ id: bookingId, ...snap.data() }),
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[Payment Webhook] ✅ ERP forward triggered for booking ${bookingId}`);
  } catch (error) {
    console.error(`[Payment Webhook] Failed to forward booking ${bookingId} to ERP:`, error.message);
  }
}

/**
 * Log payment event to Firestore.
 * @param {Object} logData
 */
async function logPaymentEvent(logData) {
  try {
    await adminDb.collection('payment_logs').add({
      ...logData,
      timestamp: logData.timestamp || new Date().toISOString(),
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('[Payment Webhook] Failed to log event:', error.message);
  }
}

/**
 * Send payment confirmation email to customer (fire-and-forget, non-blocking).
 * Fetches full booking from Firestore (webhook only has orderId).
 * Includes idempotency check to prevent duplicate emails from VNPay GET+POST.
 * @param {string} bookingId
 */
async function sendConfirmationEmail(bookingId) {
  try {
    const bookingSnap = await adminDb.collection('bookings').doc(bookingId).get();
    if (!bookingSnap.exists) return;
    const booking = { id: bookingId, ...bookingSnap.data() };
    if (booking.paymentStatus !== 'PAID') return;
    const result = await sendPaymentConfirmation(booking);
    if (result.success) {
      console.log(`[Payment Webhook] ✅ Confirmation email sent for booking ${bookingId}`);
    } else {
      console.error(`[Payment Webhook] Failed to send confirmation email for booking ${bookingId}:`, result.error);
    }
  } catch (err) {
    console.error(`[Payment Webhook] Error sending confirmation email for booking ${bookingId}:`, err.message);
  }
}

/**
 * Send payment failure email notification to customer.
 * Fetches full booking from Firestore (webhook only has orderId).
 * @param {string} bookingId
 */
async function sendFailureEmail(bookingId) {
  try {
    const bookingSnap = await adminDb.collection('bookings').doc(bookingId).get();
    if (!bookingSnap.exists) return;
    const booking = { id: bookingId, ...bookingSnap.data() };
    sendPaymentFailed(booking).catch(err =>
      console.error('[Payment Webhook] Failure email error:', err.message)
    );
  } catch (err) {
    console.error(`[Payment Webhook] Error sending failure email for ${bookingId}:`, err.message);
  }
}

// ─── Verification ────────────────────────────────────────────────────

/**
 * Verify payment signature and extract booking info.
 * @param {string} gateway - Uppercase gateway name
 * @param {Object} params - Payment parameters
 * @returns {Promise<{success: boolean, orderId: string|null, transactionId: string, message: string}>}
 */
async function verifyPayment(gateway, params) {
  switch (gateway) {
    case 'VNPAY':
      return PaymentService.verifyVNPayReturn(params);
    case 'MOMO':
      return await PaymentService.verifyMoMoReturn(params);
    case 'PAYPAL':
      if (params.status === 'cancel') {
        return { success: false, orderId: null, transactionId: '', message: 'User cancelled PayPal payment' };
      }
      return await PaymentService.verifyPayPalReturn(params);
    default:
      return { success: false, orderId: null, transactionId: '', message: `Unsupported gateway: ${gateway}` };
  }
}

// ─── GET Handler (Return / User Redirect) ────────────────────────────

/**
 * GET — Handle user redirect from payment gateway.
 * VNPay, MoMo, PayPal redirect users here after payment.
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const gateway = url.searchParams.get('gateway');

    if (!gateway) {
      return NextResponse.redirect(`${SITE_URL}/checkout?error=missing_gateway`);
    }

    const params = paramsToObject(url);
    const verifyResult = await verifyPayment(gateway.toUpperCase(), params);

    if (verifyResult.success && verifyResult.orderId) {
      await updateBookingAfterPayment(verifyResult.orderId, verifyResult.transactionId, gateway.toUpperCase());
      await releaseInventoryHold(verifyResult.orderId);
      await forwardToERP(verifyResult.orderId);
      sendConfirmationEmail(verifyResult.orderId);

      await logPaymentEvent({
        gateway,
        bookingId: verifyResult.orderId,
        event: 'payment_success',
        response: params,
      });

      return NextResponse.redirect(`${SITE_URL}/booking/confirmation/${verifyResult.orderId}?status=success`);
    }

    const fallbackId = verifyResult.orderId || 'unknown';
    sendFailureEmail(fallbackId);
    await logPaymentEvent({
      gateway,
      bookingId: fallbackId,
      event: 'payment_failed',
      error: verifyResult.message,
      response: params,
    });

    return NextResponse.redirect(
      `${SITE_URL}/booking/confirmation/${fallbackId}?status=failed&message=${encodeURIComponent(verifyResult.message)}`
    );
  } catch (error) {
    console.error('[Payment Webhook] GET Error:', error);
    return NextResponse.redirect(`${SITE_URL}/checkout?error=system_error`);
  }
}

// ─── POST Handler (IPN / Server-to-Server) ───────────────────────────

/**
 * POST — Handle IPN (Instant Payment Notification) from gateways.
 * VNPay IPN, MoMo IPN, PayPal Webhook.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const gateway = (request.headers.get('x-payment-gateway') || body.gateway || '').toUpperCase();

    if (!gateway) {
      return NextResponse.json({ error: 'Missing gateway identifier' }, { status: 400 });
    }

    let verifyResult;

    switch (gateway) {
      case 'VNPAY':
        // VNPay IPN sends all params in the body
        verifyResult = PaymentService.verifyVNPayReturn(body);
        if (verifyResult.success) {
          await updateBookingAfterPayment(verifyResult.orderId, verifyResult.transactionId, 'VNPAY');
          await releaseInventoryHold(verifyResult.orderId);
          await forwardToERP(verifyResult.orderId);
          sendConfirmationEmail(verifyResult.orderId);
          // VNPay expects specific IPN response format
          return NextResponse.json({
            RspCode: '00',
            Message: 'Confirm Success',
          });
        }
        sendFailureEmail(verifyResult.orderId);
        return NextResponse.json({
          RspCode: '99',
          Message: 'Verify signature failed',
        });

      case 'MOMO':
        verifyResult = await PaymentService.verifyMoMoReturn(body);
        if (verifyResult.success) {
          await updateBookingAfterPayment(verifyResult.orderId, verifyResult.transactionId, 'MOMO');
          await releaseInventoryHold(verifyResult.orderId);
          await forwardToERP(verifyResult.orderId);
          sendConfirmationEmail(verifyResult.orderId);
        }
        return new NextResponse(null, { status: 204 }); // MoMo expects 204 No Content

      case 'PAYPAL':
        // PayPal sends webhook event notifications
        verifyResult = await verifyPayment('PAYPAL', body);
        if (verifyResult.success && verifyResult.orderId) {
          await updateBookingAfterPayment(verifyResult.orderId, verifyResult.transactionId, 'PAYPAL');
          await releaseInventoryHold(verifyResult.orderId);
          await forwardToERP(verifyResult.orderId);
          sendConfirmationEmail(verifyResult.orderId);
        }
        return NextResponse.json({ received: true });

      case 'STRIPE':
        // TODO: Implement Stripe webhook verification when STRIPE_SECRET_KEY is available
        return NextResponse.json({ message: 'Stripe webhook not yet configured' }, { status: 501 });

      default:
        return NextResponse.json({ error: `Unsupported gateway: ${gateway}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[Payment Webhook] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
