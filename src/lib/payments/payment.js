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
    // 2. MOMO (PRODUCTION)
    // ==========================================
    static async createMoMoUrl(orderData) {
        const partnerCode = process.env.MOMO_PARTNER_CODE;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        const secretKey = process.env.MOMO_SECRET_KEY;
        const apiUrl = process.env.MOMO_ENDPOINT;
        
        const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/payment/momo-return`;
        const ipnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/webhook/momo`; // Cấu hình webhook sau

        const requestId = orderData.orderId + new Date().getTime(); // Chống trùng lặp
        const requestType = "captureWallet";
        const extraData = ""; // Dữ liệu mã hóa base64 nếu cần truyền thêm

        // MoMo bắt buộc nối chuỗi đúng thứ tự này, sai 1 ký tự là lỗi Signature
        const rawSignature = `accessKey=${accessKey}&amount=${orderData.amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderData.orderId}&orderInfo=Thanh toan don hang ${orderData.orderId}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        
        const signature = PaymentHelper.generateHmac(rawSignature, secretKey, 'sha256');

        const requestBody = JSON.stringify({
            partnerCode,
            partnerName: "9TRIP B2C",
            storeId: "9TRIP_STORE",
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
    // 3. PAYPAL (PRODUCTION)
    // ==========================================
    static async createPayPalUrl(orderData) {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secretKey = process.env.PAYPAL_SECRET_KEY;
        const apiUrl = process.env.PAYPAL_API_URL;

        // B1: Lấy Access Token từ PayPal
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
        if (!tokenData.access_token) throw new Error('Không thể xác thực PayPal');

        // B2: Chuyển đổi VND sang USD (Tỉ giá tạm tính 25000, bro tự update tỉ giá động nếu cần)
        const exchangeRate = 25000;
        const amountUSD = (orderData.amount / exchangeRate).toFixed(2);

        // B3: Tạo Order
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
                    amount: {
                        currency_code: "USD",
                        value: amountUSD
                    },
                    description: `Don hang ${orderData.orderId}`
                }],
                application_context: {
                    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/paypal-return`,
                    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/paypal-cancel`
                }
            })
        });

        const orderResult = await orderResponse.json();
        
        // PayPal trả về một mảng các links, ta cần tìm link 'approve'
        const approveLink = orderResult.links.find(link => link.rel === 'approve');
        if (!approveLink) throw new Error('Không thể tạo link thanh toán PayPal');

        return approveLink.href;
    }
}