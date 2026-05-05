import { PaymentHelper } from './paymentHelper';
import crypto from 'crypto';

export class PaymentService {
    
    // ==========================================
    // 1. VNPAY (SANDBOX)
    // ==========================================
    static createVNPayUrl(req, orderData) {
        const tmnCode = process.env.VNPAY_TMN_CODE;
        const secretKey = process.env.VNPAY_HASH_SECRET;
        const vnpUrl = process.env.VNPAY_URL;
        const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/webhooks/payment?gateway=vnpay`;

        let ipAddr = req.headers.get('x-forwarded-for') || '127.0.0.1';
        let createDate = PaymentHelper.formatVNPayDate(new Date());

        let vnp_Params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': tmnCode,
            'vnp_Locale': 'vn',
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': orderData.orderId,
            'vnp_OrderInfo': `Thanh toan don hang ${orderData.orderId}`,
            'vnp_OrderType': 'other',
            'vnp_Amount': orderData.amount * 100, // Định dạng VNPay (nhân 100)
            'vnp_ReturnUrl': returnUrl,
            'vnp_IpAddr': ipAddr,
            'vnp_CreateDate': createDate
        };

        vnp_Params = PaymentHelper.sortObject(vnp_Params);
        const signData = new URLSearchParams(vnp_Params).toString();
        const secureHash = PaymentHelper.generateHmac(signData, secretKey, 'sha512');
        vnp_Params['vnp_SecureHash'] = secureHash;

        return `${vnpUrl}?${new URLSearchParams(vnp_Params).toString()}`;
    }

    // ==========================================
    // 2. MOMO (PRODUCTION)
    // ==========================================
    static async createMoMoUrl(orderData) {
        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const apiUrl = process.env.MOMO_ENDPOINT;
        
        const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/webhooks/payment?gateway=momo`;
        const ipnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/webhooks/payment`;

        const requestId = orderData.orderId + new Date().getTime(); // Chống trùng lặp
        const requestType = "captureWallet";
        const extraData = ""; // Dữ liệu mã hóa base64 nếu cần truyền thêm

        // MoMo bắt buộc nối chuỗi đúng thứ tự này, sai 1 ký tự là lỗi Signature
        const rawSignature = `accessKey=${accessKey}&amount=${orderData.amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderData.orderId}&orderInfo=Thanh toan don hang ${orderData.orderId}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        
        const signature = PaymentHelper.generateHmac(rawSignature, secretKey, 'sha256');

        const requestBody = JSON.stringify({
            partnerCode,
            partnerName: "TRẦN THỪA ANH",
            storeId: "9TRIP_STORE_001",
            requestId,
            amount: orderData.amount,
            orderId: orderData.orderId,
            orderInfo: `Thanh toan don hang ${orderData.orderId}`,
            redirectUrl,
            ipnUrl,
            lang: "vi",
            requestType,
            autoCapture: true,
            extraData,
            signature
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const data = await response.json();
        
        if (data.resultCode !== 0) {
            throw new Error(`MoMo Error: ${data.message}`);
        }

        return data.payUrl;
    }

    // ==========================================
    // PAYPAL (PRODUCTION / SANDBOX)
    // ==========================================
    static async createPayPalUrl(orderData) {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secretKey = process.env.PAYPAL_CLIENT_SECRET;
        const apiUrl = process.env.PAYPAL_API_URL;

        // 1. Kiểm tra biến môi trường (Debug cấp 1)
        if (!clientId || !secretKey || !apiUrl) {
             console.error("LỖI PAYPAL ENV:", { clientId: !!clientId, secretKey: !!secretKey, apiUrl });
             throw new Error("Thiếu cấu hình PayPal trong file .env");
        }

        // 2. Xác thực để lấy Access Token
        const auth = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        const tokenData = await tokenResponse.json();
        
        // 3. Xử lý lỗi xác thực (Debug cấp 2)
        if (!tokenResponse.ok) {
            console.error("\n=== LỖI PAYPAL AUTH ===");
            console.error("Status:", tokenResponse.status);
            console.error("Response:", tokenData);
            console.error("API URL đang gọi:", apiUrl);
            console.error("=======================\n");
            
            // Bắt lỗi cụ thể
            if (tokenResponse.status === 401) {
                throw new Error("Xác thực PayPal thất bại: Sai Client ID hoặc Secret Key. Hãy kiểm tra lại môi trường (Sandbox/Live).");
            }
            throw new Error(`Lỗi PayPal Auth: ${tokenData.error_description || tokenData.error}`);
        }

        // 4. Chuyển đổi tiền tệ (Tỷ giá tạm tính)
        const exchangeRate = 25000;
        const amountUSD = (orderData.amount / exchangeRate).toFixed(2);

        // 5. Tạo đơn hàng (Create Order)
        const orderResponse = await fetch(`${apiUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [{
                    reference_id: orderData.orderId, // Gắn ID đơn hàng của mình vào đây
                    amount: { 
                        currency_code: "USD", 
                        value: amountUSD 
                    },
                    description: `Thanh toan don hang ${orderData.orderId}`
                }],
                application_context: {
                    // Cấu hình trang trả về khi khách thanh toán xong hoặc hủy
                    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/webhooks/payment?gateway=paypal`,
                    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/webhooks/payment?gateway=paypal&status=cancel`
                }
            })
        });

        const orderResult = await orderResponse.json();
        
        // 6. Xử lý lỗi tạo đơn (Debug cấp 3)
        if (!orderResponse.ok) {
            console.error("\n=== LỖI TẠO ĐƠN PAYPAL ===");
            console.error("Status:", orderResponse.status);
            console.error("Response:", orderResult);
            console.error("==========================\n");
            throw new Error(`Lỗi tạo đơn PayPal: ${orderResult.message || 'Không rõ nguyên nhân'}`);
        }

        // 7. Lấy link thanh toán trả về cho Frontend
        const approveLink = orderResult.links.find(link => link.rel === 'approve');
        
        if (!approveLink) {
             throw new Error("Không tìm thấy link thanh toán (approve URL) từ PayPal.");
        }

        return approveLink.href;
    }

    // ==========================================
    // XÁC THỰC KẾT QUẢ VNPAY TRẢ VỀ
    // ==========================================
    static verifyVNPayReturn(vnpayParams) {
        const secretKey = process.env.VNPAY_HASH_SECRET;
        let secureHash = vnpayParams['vnp_SecureHash'];

        // Xóa 2 param này trước khi tạo chuỗi hash
        delete vnpayParams['vnp_SecureHash'];
        delete vnpayParams['vnp_SecureHashType'];

        // Sắp xếp lại object như lúc tạo link
        vnpayParams = PaymentHelper.sortObject(vnpayParams);
        
        const signData = new URLSearchParams(vnpayParams).toString();
        const checkSum = PaymentHelper.generateHmac(signData, secretKey, 'sha512');

        // So sánh chữ ký
        if (secureHash === checkSum) {
            // Kiểm tra mã phản hồi (00 là giao dịch thành công)
            if (vnpayParams['vnp_ResponseCode'] === '00') {
                return { success: true, orderId: vnpayParams['vnp_TxnRef'], message: 'Giao dịch thành công' };
            } else {
                return { success: false, orderId: vnpayParams['vnp_TxnRef'], message: `Giao dịch thất bại. Mã lỗi: ${vnpayParams['vnp_ResponseCode']}` };
            }
        } else {
            return { success: false, message: 'Chữ ký không hợp lệ! Nghi ngờ giả mạo dữ liệu.' };
        }
    }

    static async verifyMoMoReturn(params) {
        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;

        const {
            amount, extraData, message, orderId, orderInfo,
            orderType, payType, requestId, responseTime,
            resultCode, transId, signature
        } = params;

        // 1. Tạo chuỗi ký theo đúng chuẩn MoMo (Theo thứ tự chữ cái của tên biến)
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

        // 2. Mã hóa HMAC SHA256
        const expectedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        // 3. So sánh chữ ký để chống Hacker sửa data
        if (signature !== expectedSignature) {
            console.error('LỖI CHỮ KÝ MOMO:', { expected: expectedSignature, actual: signature });
            return { success: false, orderId, message: 'Sai chữ ký bảo mật từ MoMo.' };
        }

        // 4. Kiểm tra mã lỗi (resultCode = 0 là thành công)
        if (resultCode === '0') {
            return { success: true, orderId, message: 'Thanh toán MoMo thành công' };
        } else {
            return { success: false, orderId, message: `Giao dịch thất bại: ${message}` };
        }
    }

    // ==========================================
    // KIỂM TRA VÀ CHỐT KẾT QUẢ TỪ PAYPAL
    // ==========================================
    static async verifyPayPalReturn(params) {
        const token = params.token; // PayPal Order ID (cái token trên URL chính là ID của PayPal)
        const payerId = params.PayerID;

        if (!token || !payerId) {
            return { success: false, message: 'Thiếu thông tin xác thực từ PayPal.' };
        }

        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secretKey = process.env.PAYPAL_CLIENT_SECRET;
        const apiUrl = process.env.PAYPAL_API_URL;

        try {
            // 1. Phải lấy Access Token lại 1 lần nữa
            const auth = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
            const tokenResponse = await fetch(`${apiUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });

            if (!tokenResponse.ok) {
                return { success: false, message: 'Không thể xác thực với PayPal server.' };
            }
            const tokenData = await tokenResponse.json();

            // 2. Lệnh CAPTURE: Bắt buộc phải gọi lệnh này thì tiền mới thực sự từ ví khách chạy về ví mình
            const captureResponse = await fetch(`${apiUrl}/v2/checkout/orders/${token}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            const captureData = await captureResponse.json();

            // 3. Xử lý kết quả trả về
            if (captureResponse.ok && captureData.status === 'COMPLETED') {
                // Móc lại cái orderId của hệ thống mình (đã nhét vào reference_id lúc tạo link)
                const systemOrderId = captureData.purchase_units[0].reference_id;
                return { success: true, orderId: systemOrderId, message: 'Thanh toán PayPal thành công' };
            } else {
                // Cố gắng cứu lại cái orderId để hiện trên trang lỗi
                const systemOrderId = captureData.purchase_units?.[0]?.reference_id || 'unknown';
                return { 
                    success: false, 
                    orderId: systemOrderId, 
                    message: `Lỗi Capture PayPal: ${captureData.message || captureData.status}` 
                };
            }
        } catch (error) {
            console.error('[PAYPAL_VERIFY_ERROR]:', error);
            return { success: false, message: 'Lỗi mạng khi gọi PayPal API.' };
        }
    }
}