import { PaymentHelper } from './paymentHelper';

export class PaymentService {
    
    // ==========================================
    // 1. VNPAY (SANDBOX)
    // ==========================================
    static createVNPayUrl(req, orderData) {
        const tmnCode = process.env.VNPAY_TMN_CODE;
        const secretKey = process.env.VNPAY_HASH_SECRET;
        const vnpUrl = process.env.VNPAY_URL;
        const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/payment/vnpay-return`;

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
    // MOMO DEBUG MODE
    // ==========================================
    static async createMoMoUrl(orderData) {
        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const apiUrl = process.env.MOMO_API_URL;
        
        const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment/momo-return`;
        const ipnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/webhook/momo`;

        const requestId = orderData.orderId + "_" + new Date().getTime(); // Thêm dấu _ cho chắc cốp
        const requestType = "captureWallet";
        const extraData = ""; 
        const orderInfo = `Thanh toan don hang ${orderData.orderId}`;
        const amountStr = orderData.amount.toString(); // Ép kiểu chuỗi để tránh lỗi signature

        // MoMo bắt buộc nối chuỗi chuẩn xác 100%
        const rawSignature = `accessKey=${accessKey}&amount=${amountStr}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderData.orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        
        const signature = PaymentHelper.generateHmac(rawSignature, secretKey, 'sha256');

        const requestBody = JSON.stringify({
            partnerCode: partnerCode,
            partnerName: "9TRIP",
            storeId: "9TRIP_STORE",
            requestId: requestId,
            amount: Number(orderData.amount), // Gửi lên bắt buộc là Number
            orderId: orderData.orderId,
            orderInfo: orderInfo,
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            lang: "vi",
            requestType: requestType,
            autoCapture: true,
            extraData: extraData,
            signature: signature
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        });

        const data = await response.json();
        
        // DEBUG LỖI MOMO Ở ĐÂY
        if (data.resultCode !== 0) {
            console.error("\n=== LỖI MOMO CHI TIẾT ===");
            console.error("Result Code:", data.resultCode);
            console.error("Message:", data.message);
            console.error("Local Message:", data.localMessage);
            console.error("Raw Signature đã nối:", rawSignature);
            console.error("=========================\n");
            throw new Error(`Lỗi MoMo [${data.resultCode}]: ${data.localMessage || data.message}`);
        }

        return data.payUrl;
    }

    // ==========================================
    // PAYPAL DEBUG MODE
    // ==========================================
    static async createPayPalUrl(orderData) {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secretKey = process.env.PAYPAL_SECRET_KEY;
        const apiUrl = process.env.PAYPAL_API_URL;

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
        
        // DEBUG LỖI PAYPAL Ở ĐÂY
        if (!tokenResponse.ok) {
            console.error("\n=== LỖI PAYPAL AUTH ===");
            console.error(tokenData);
            console.error("=======================\n");
            throw new Error(`PayPal auth failed: ${tokenData.error_description || tokenData.error}`);
        }

        // ... phần dưới giữ nguyên ...
        const exchangeRate = 25000;
        const amountUSD = (orderData.amount / exchangeRate).toFixed(2);

        const orderResponse = await fetch(`${apiUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [{
                    reference_id: orderData.orderId,
                    amount: { currency_code: "USD", value: amountUSD },
                    description: `Don hang ${orderData.orderId}`
                }],
                application_context: {
                    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/paypal-return`,
                    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/paypal-cancel`
                }
            })
        });

        const orderResult = await orderResponse.json();
        
        if (!orderResponse.ok) {
            console.error("\n=== LỖI TẠO ĐƠN PAYPAL ===");
            console.error(orderResult);
            console.error("==========================\n");
            throw new Error('Lỗi tạo đơn PayPal');
        }

        const approveLink = orderResult.links.find(link => link.rel === 'approve');
        return approveLink.href;
    }
}