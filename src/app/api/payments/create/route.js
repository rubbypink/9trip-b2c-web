import { NextResponse } from 'next/server';
import { createBookingAdmin } from '@/lib/firestore-admin';
import { PaymentService } from '@/lib/payments/payment';

export async function POST(request) {
  try {
    const body = await request.json();
    const { gateway, amount, bookingData, orderId } = body;

    if (!gateway || !amount) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    if (!bookingData && !orderId) {
      return NextResponse.json({ success: false, message: "Missing bookingData or orderId" }, { status: 400 });
    }

    const validGateways = ['VNPAY', 'MOMO', 'PAYPAL'];
    if (!validGateways.includes(gateway.toUpperCase())) {
      return NextResponse.json({ success: false, message: "Unsupported payment gateway" }, { status: 400 });
    }

    let bookingId;

    if (bookingData) {
      const pendingBooking = {
        ...bookingData,
        gateway: gateway.toUpperCase(),
        status: 'pending_payment',
      };

      bookingId = await createBookingAdmin(pendingBooking);
      if (!bookingId) {
        return NextResponse.json({ success: false, message: "Failed to create booking" }, { status: 500 });
      }
    } else {
      bookingId = orderId;
    }

    const orderData = { orderId: bookingId, amount };

    let paymentUrl;
    const gw = gateway.toUpperCase();

    try {
      switch (gw) {
        case 'VNPAY':
          paymentUrl = PaymentService.createVNPayUrl(request, orderData);
          break;
        case 'MOMO':
          paymentUrl = await PaymentService.createMoMoUrl(orderData);
          break;
        case 'PAYPAL':
          paymentUrl = await PaymentService.createPayPalUrl(orderData);
          break;
        default:
          return NextResponse.json({ success: false, message: "Unsupported gateway" }, { status: 400 });
      }
    } catch (gatewayErr) {
      return NextResponse.json({ success: false, message: `Payment gateway error: ${gatewayErr.message}` }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      url: paymentUrl,
      bookingId,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}