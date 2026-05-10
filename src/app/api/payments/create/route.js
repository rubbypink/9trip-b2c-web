import { NextResponse } from 'next/server';
import { PaymentService } from '@/lib/payments/payment';
import { adminDb, generateNextId } from '@/lib/firebase-admin';
import { sendBookingConfirmation } from '@/lib/email';

export async function POST(req) {
    try {
        const body = await req.json();
        const { gateway, amount, bookingData } = body;

        if (!amount || !gateway || !bookingData) {
            return NextResponse.json({ success: false, message: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        // 1. TAO BOOKING ID SEQUENTIAL
        const orderId = await generateNextId('bookings');
        const bookingRef = adminDb.collection('bookings').doc(orderId);

        // 2. TINH TOAN PAYMENT
        const rawItems = bookingData.items || [];
        const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);

        const total = items.reduce((sum, item) => sum + (item.total || 0), 0);

        // Calculate deposit from item prepaid percentages
        const deposit = items.reduce((sum, item) => {
            const prepaidPct = item.prepaid || 0;
            return sum + (item.total || 0) * prepaidPct / 100;
        }, 0);

        const balance = total - deposit;

        // Determine prepaid type
        const allOrder = items.length > 0 && items.every(item => (item.prepaid || 0) === 0);
        const prepaidType = allOrder ? 'order' : (deposit >= total ? 'full' : 'deposit');

        // Determine status
        const status = allOrder ? 'ordered' : 'pending';

        // Due date calculation
        let dueDate = null;
        if (allOrder) {
            dueDate = items[0]?.startDate || null;
        } else {
            // Default due date: 60 minutes from now for payment
            dueDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        }

        // 3. CLEAN CONTACT INFO - strip Firebase Auth tokens
        const cleanContactInfo = {
            fullName: bookingData.contactInfo?.fullName || '',
            email: bookingData.contactInfo?.email || '',
            phone: bookingData.contactInfo?.phone || '',
            specialRequests: bookingData.contactInfo?.specialRequests || ''
        };

        // 4. BUILD BOOKING DOCUMENT
        const bookingDoc = {
            id: orderId,
            userId: bookingData.userId || '',
            bookingCode: bookingData.bookingCode || `9T-${orderId}`,
            items: items,
            payment: {
                prepaid: prepaidType,
                total: Math.round(total),
                deposit: Math.round(deposit),
                balance: Math.round(balance),
                gate: gateway.toUpperCase(),
                date: null,
                dueDate: dueDate
            },
            status: status,
            contactInfo: cleanContactInfo,
            couponCode: bookingData.couponCode || null,
            erpSyncStatus: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 5. SAVE
        await bookingRef.set(bookingDoc);

        // 6. SEND CONFIRMATION EMAIL if ordered
        if (status === 'ordered') {
            sendBookingConfirmation(bookingDoc).catch(err =>
                console.error('[Email] Booking confirmation failed:', err.message)
            );
        }

        // 7. CREATE PAYMENT URL
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
                await bookingRef.delete();
                return NextResponse.json({ success: false, message: 'Cổng thanh toán không hợp lệ' }, { status: 400 });
        }

        return NextResponse.json({ success: true, url: paymentUrl, bookingId: orderId }, { status: 200 });

    } catch (error) {
        console.error('[API_PAYMENT_CREATE_ERROR]:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
