import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req) {
    try {
        const body = await req.json();
        // Nhận thêm couponCode để Validate luôn trên server
        const { items, couponCode } = body; 

        if (!items || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Giỏ hàng trống' }, { status: 400 });
        }

        let subtotal = 0;
        let validatedItems = [];

        // ==========================================
        // BƯỚC 1: TÍNH GIÁ TỪNG MÓN DỰA TRÊN FIRESTORE
        // ==========================================
        for (const item of items) {
            let collectionName = '';
            switch (item.serviceType) {
                case 'tour': collectionName = 'tours'; break;
                case 'hotel': collectionName = 'rooms'; break; 
                case 'activity': collectionName = 'activities'; break;
                default: 
                    return NextResponse.json({ success: false, message: `Loại dịch vụ không hợp lệ: ${item.serviceType}` }, { status: 400 });
            }

            const docRef = adminDb.collection(collectionName).doc(item.serviceId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                return NextResponse.json({ success: false, message: `Dịch vụ ${item.serviceId} không còn tồn tại` }, { status: 404 });
            }

            const dbData = docSnap.data();

            // Lấy giá gốc từ DB (Phòng trường hợp các field tên khác nhau, bro tự map lại cho chuẩn DB của mình nhé)
            const adultPrice = dbData.adultPrice || dbData.price || 0;
            const childPrice = dbData.childPrice || 0;
            const infantPrice = dbData.infantPrice || 0;
            const discountPercent = dbData.discountPercent || 0; // % giảm giá riêng của từng tour/phòng

            const adults = item.adults || 1;
            const children = item.children || 0;
            const infants = item.infants || 0;

            // Bê nguyên công thức calcBookingPrice của bro vào đây
            const baseTotal = (adultPrice * adults) + (childPrice * children) + (infantPrice * infants);
            const itemDiscountAmount = baseTotal * (discountPercent / 100);
            const finalTotal = baseTotal - itemDiscountAmount;

            subtotal += finalTotal;

            validatedItems.push({
                ...item,
                dbPrice: {
                    baseTotal,
                    discountAmount: itemDiscountAmount,
                    finalTotal
                }
            });
        }

        // Làm tròn subtotal như Front-end
        subtotal = Math.round(subtotal);

        // ==========================================
        // BƯỚC 2: TÍNH COUPON DISCOUNT DỰA TRÊN DB
        // ==========================================
        let couponDiscount = 0;
        let couponData = null;

        if (couponCode) {
            const couponRef = adminDb.collection('coupons').doc(couponCode);
            const couponSnap = await couponRef.get();

            if (couponSnap.exists) {
                const coupon = couponSnap.data();
                
                // Check minSpend y hệt code bro
                if (!coupon.minSpend || subtotal >= coupon.minSpend) {
                    if (coupon.type === "percent") {
                        couponDiscount = subtotal * ((coupon.amount || 0) / 100);
                    } else {
                        couponDiscount = coupon.amount || 0;
                    }
                    // Chặn discount không vượt quá subtotal
                    couponDiscount = Math.round(Math.min(couponDiscount, subtotal));
                    couponData = { code: couponCode, ...coupon };
                }
            }
        }

        // ==========================================
        // BƯỚC 3: TÍNH THUẾ VÀ GRAND TOTAL
        // ==========================================
        const taxRate = 0.08; // 8%
        const tax = Math.round((subtotal - couponDiscount) * taxRate);
        const grandTotal = Math.round(subtotal - couponDiscount + tax);

        // ==========================================
        // TRẢ KẾT QUẢ VỀ CHO FRONTEND
        // ==========================================
        return NextResponse.json({
            success: true,
            pricing: {
                subtotal,
                couponDiscount,
                tax,
                grandTotal
            },
            validatedItems,
            couponData
        });

    } catch (error) {
        console.error('[API_VALIDATE_CART_ERROR]:', error);
        return NextResponse.json({ success: false, message: 'Lỗi hệ thống khi thẩm định giá' }, { status: 500 });
    }
}