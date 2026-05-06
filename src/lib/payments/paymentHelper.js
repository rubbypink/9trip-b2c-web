import crypto from 'crypto';

export const PaymentHelper = {
    // Sắp xếp object theo Alphabet (Dùng cho VNPay)
    sortObject: (obj) => {
        let sorted = {};
        let str = [];
        let key;
        for (key in obj){
            if (obj.hasOwnProperty(key)) {
                str.push(encodeURIComponent(key));
            }
        }
        str.sort();
        for (key = 0; key < str.length; key++) {
            sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
        }
        return sorted;
    },

    // Băm chuỗi bảo mật (Hỗ trợ cả SHA512 cho VNPay và SHA256 cho MoMo)
    generateHmac: (data, secretKey, algorithm = 'sha512') => {
        const hmac = crypto.createHmac(algorithm, secretKey);
        return hmac.update(Buffer.from(data, 'utf-8')).digest('hex');
    },
    
    // Format ngày chuẩn yyyyMMddHHmmss cho VNPay
    formatVNPayDate: (date) => {
        const pad = (n) => (n < 10 ? '0' + n : n);
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    }
};