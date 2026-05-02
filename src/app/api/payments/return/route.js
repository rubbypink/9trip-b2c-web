import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments/payment';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://9tripphuquoc.com';

    try {
        const url = new URL(req.url);
        const searchParams = url.searchParams;
        
        // Lấy cái "bảng tên" gateway mà mình đã nhét vào lúc tạo link
        const gateway = searchParams.get('gateway');
        
        if (!gateway) {
            return NextResponse.redirect(`${siteUrl}/checkout?error=system_missing_gateway`);
        }

        // Đổ toàn bộ query params vào một object để xử lý
        let params = {};
        for (const [key, value] of searchParams.entries()) {
            params[key] = value;
        }

        let verifyResult = { success: false, orderId: null, message: 'Chưa xử lý' };

        // Dựa vào gateway để gọi đúng hàm kiểm tra chữ ký
        switch (gateway.toUpperCase()) {
            case 'VNPAY':
                verifyResult = PaymentService.verifyVNPayReturn(params);
                break;
            case 'MOMO':
                verifyResult = await PaymentService.verifyMoMoReturn(params);
                break;
            case 'PAYPAL':
                // PayPal có link cancel riêng nên phải check thêm param status
                if (params.status === 'cancel') {
                    // Cần lấy token từ URL để biết mã đơn (nếu bro có mapping token -> orderId trong DB)
                    // Hoặc đơn giản là báo hủy
                    verifyResult = { success: false, orderId: null, message: 'Người dùng đã hủy thanh toán PayPal.' };
                } else {
                    verifyResult = await PaymentService.verifyPayPalReturn(params);
                }
                break;
            default:
                verifyResult = { success: false, message: 'Cổng thanh toán không hợp lệ.' };
        }

        // XỬ LÝ KẾT QUẢ CHUNG CHO CẢ 3 CỔNG
        if (verifyResult.success && verifyResult.orderId) {
            // NẾU THÀNH CÔNG: Chốt đơn vào DB
            try {
                await adminDb.collection('bookings').doc(verifyResult.orderId).update({ 
                    paymentStatus: 'PAID',
                    updatedAt: new Date().toISOString()
                });
            } catch (dbError) {
                console.error('[DB_UPDATE_ERROR]:', dbError);
            }
            
            // Đá về trang xanh lá
            return NextResponse.redirect(`${siteUrl}/booking/confirmation/${verifyResult.orderId}?status=success`);
        } else {
            // NẾU THẤT BẠI: Đá về trang báo đỏ kèm nút Retry
            const fallbackOrderId = verifyResult.orderId || 'unknown';
            return NextResponse.redirect(`${siteUrl}/booking/confirmation/${fallbackOrderId}?status=failed&message=${encodeURIComponent(verifyResult.message)}`);
        }

    } catch (error) {
        console.error('[API_UNIFIED_RETURN_ERROR]:', error);
        return NextResponse.redirect(`${siteUrl}/checkout?error=system_crash`);
    }
}