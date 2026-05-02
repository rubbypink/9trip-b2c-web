"use client";

import { useState } from "react";

export default function CheckoutPayment({ orderId, amount }) {
    const [isLoading, setIsLoading] = useState(false);
    const [gateway, setGateway] = useState("VNPAY"); // Mặc định chọn VNPay

    const handlePaymentSubmit = async () => {
        setIsLoading(true);

        try {
            // Gọi lên Backend (Next.js API Route)
            const response = await fetch("/api/payments/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    gateway: gateway,
                    amount: amount,
                    orderId: orderId,
                }),
            });

            const data = await response.json();

            // Nếu Backend trả về URL thành công
            if (response.ok && data.success && data.url) {
                // Redirect user sang cổng thanh toán
                window.location.href = data.url;
            } else {
                // Xử lý lỗi từ Server trả về (Thiếu params, sai key, v.v.)
                alert(`Lỗi tạo thanh toán: ${data.message}`);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Payment Submission Error:", error);
            alert("Mất kết nối đến máy chủ. Vui lòng thử lại!");
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Phương thức thanh toán</h2>
            
            {/* Lựa chọn Cổng thanh toán */}
            <div className="flex flex-col gap-3 mb-6">
                <label className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${gateway === 'VNPAY' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                        type="radio" 
                        name="gateway" 
                        value="VNPAY" 
                        checked={gateway === 'VNPAY'} 
                        onChange={(e) => setGateway(e.target.value)}
                        className="mr-3"
                    />
                    <span className="font-medium text-gray-700">VNPay (Thẻ ATM/QR Code)</span>
                </label>

                <label className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${gateway === 'MOMO' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                        type="radio" 
                        name="gateway" 
                        value="MOMO" 
                        checked={gateway === 'MOMO'} 
                        onChange={(e) => setGateway(e.target.value)}
                        className="mr-3"
                    />
                    <span className="font-medium text-gray-700">Ví MoMo</span>
                </label>

                <label className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${gateway === 'PAYPAL' ? 'border-blue-700 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                        type="radio" 
                        name="gateway" 
                        value="PAYPAL" 
                        checked={gateway === 'PAYPAL'} 
                        onChange={(e) => setGateway(e.target.value)}
                        className="mr-3"
                    />
                    <span className="font-medium text-gray-700">PayPal (Thẻ Quốc tế)</span>
                </label>
            </div>

            <button
            onClick={handleFinalizeBooking}
            disabled={isLoading}
            // Ép cố định chiều cao, overflow-hidden để không cho thành phần con tràn ra ngoài
            className={`w-full flex items-center justify-center py-3 px-4 min-h-[52px] max-h-[52px] rounded-xl font-bold transition-all duration-300 overflow-hidden ${
                isLoading 
                ? "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none" 
                : "bg-primary-600 text-white hover:bg-primary-700 shadow-lg"
            }`}
            >
            {isLoading ? (
                // Ép nằm trên 1 hàng ngang (flex-row), cấm rớt dòng (whitespace-nowrap)
                <span className="flex flex-row items-center justify-center gap-2 whitespace-nowrap">
                
                {/* Cố định cứng kích thước bằng style inline, vô hiệu hóa mọi CSS bên ngoài */}
                <svg 
                    className="animate-spin shrink-0" 
                    style={{ width: '20px', height: '20px', minWidth: '20px' }} 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                
                Đang xử lý...
                </span>
            ) : (
                // Cấm rớt dòng cho chữ "Thanh toán"
                <span className="whitespace-nowrap">
                Thanh toán {grandTotal?.toLocaleString('vi-VN')} đ
                </span>
            )}
            </button>
        </div>
    );
}