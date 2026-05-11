import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments/payment';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

export async function POST(req) {
    try {
        const body = await req.json();
        const { bookingId, newGateway } = body; // Có thể nhận thêm newGateway nếu cho khách đổi cổng

        if (!bookingId) {
            return NextResponse.json({ success: false, message: 'Thiếu mã đơn hàng' }, { status: 400 });
        }

        // 1. Chọc vào Firestore lấy thông tin đơn cũ
        const bookingRef = adminDb.collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
            return NextResponse.json({ success: false, message: 'Không tìm thấy đơn hàng' }, { status: 404 });
        }

        const bookingData = bookingDoc.data();

        // Check xem có người táy máy gửi request bậy bạ không
        if (bookingData.status === 'paid') {
            return NextResponse.json({ success: false, message: 'Đơn hàng này đã được thanh toán!' }, { status: 400 });
        }

        // 2. Lấy số tiền và cổng thanh toán
        // Nếu khách muốn đổi từ VNPay sang MoMo, mình cập nhật luôn
        const paymentInfo = bookingData.payment || {};
        const gatewayToUse = newGateway || paymentInfo.gate;
        const amount = paymentInfo.total || bookingData.pricing?.total;

        if (newGateway && newGateway !== paymentInfo.gate) {
            await bookingRef.update({ 'payment.gate': newGateway.toUpperCase() });
        }

        // 3. Sinh link thanh toán mới
        let paymentUrl = '';
        const paymentPayload = { amount, orderId: bookingId };

        switch (gatewayToUse.toUpperCase()) {
            case 'VNPAY':
                paymentUrl = PaymentService.createVNPayUrl(req, paymentPayload);
                break;
            case 'MOMO':
                paymentUrl = await PaymentService.createMoMoUrl(paymentPayload);
                break;
            case 'PAYPAL':
                paymentUrl = await PaymentService.createPayPalUrl(paymentPayload);
                break;
            default:
                return NextResponse.json({ success: false, message: 'Cổng thanh toán không hợp lệ' }, { status: 400 });
        }

        return NextResponse.json({ success: true, url: paymentUrl }, { status: 200 });

    } catch (error) {
        logger.error('[API_RETRY_PAYMENT_ERROR]:', error);
        return NextResponse.json({ success: false, message: 'Lỗi hệ thống khi tạo lại thanh toán' }, { status: 500 });
    }
}