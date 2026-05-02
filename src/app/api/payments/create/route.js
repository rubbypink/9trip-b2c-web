import { NextResponse } from 'next/server';
// Cập nhật đường dẫn import theo đúng thư mục của bro
import { PaymentService } from '@/lib/payments/payment'; 

export async function POST(req) {
    try {
        const body = await req.json();
        const { amount, orderId, gateway } = body;

        if (!amount || !orderId || !gateway) {
            return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc (amount, orderId, gateway)' }, { status: 400 });
        }

        let paymentUrl = '';

        switch (gateway.toUpperCase()) {
            case 'VNPAY':
                paymentUrl = PaymentService.createVNPayUrl(req, { amount, orderId });
                break;
            case 'MOMO':
                paymentUrl = await PaymentService.createMoMoUrl({ amount, orderId });
                break;
            case 'PAYPAL':
                paymentUrl = await PaymentService.createPayPalUrl({ amount, orderId });
                break;
            default:
                return NextResponse.json({ success: false, message: 'Cổng thanh toán không hợp lệ' }, { status: 400 });
        }

        return NextResponse.json({ success: true, url: paymentUrl }, { status: 200 });

    } catch (error) {
        console.error('[API_PAYMENT_CREATE_ERROR]:', error);
        return NextResponse.json({ success: false, message: error.message || 'Lỗi server' }, { status: 500 });
    }
}