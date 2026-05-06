import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments/payment'; 
// Gọi adminDb từ file mới tạo
import { adminDb } from '@/lib/firebase-admin'; 

export async function POST(req) {
    try {
        const body = await req.json();
        const { gateway, amount, bookingData } = body;

        if (!amount || !gateway || !bookingData) {
            return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        // 1. LƯU BOOKING VÀO FIRESTORE BẰNG ADMIN SDK
        const bookingRef = adminDb.collection('bookings').doc();
        const orderId = bookingRef.id; 

        await bookingRef.set({
            ...bookingData,
            id: orderId,
            paymentGateway: gateway.toUpperCase(),
            paymentStatus: 'PENDING',
            createdAt: new Date().toISOString(),
        });

        // 2. TẠO LINK THANH TOÁN
        let paymentUrl = '';
        const paymentPayload = { amount, orderId, bookingData };

        switch (gateway.toUpperCase()) {
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
                await bookingRef.delete(); // Rollback nếu lỗi
                return NextResponse.json({ success: false, message: 'Cổng thanh toán không hợp lệ' }, { status: 400 });
        }

        return NextResponse.json({ success: true, url: paymentUrl, bookingId: orderId }, { status: 200 });

    } catch (error) {
        console.error('[API_PAYMENT_CREATE_ERROR]:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}