"use client";

import { useSearchParams, useRouter } from "next/navigation"; // Thêm useRouter
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart"; // Import useCart của bro vào
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { logger } from "@/lib/logger";

export default function BookingConfirmationPage({ params }) {
    const { bookingId } = params; 
    const searchParams = useSearchParams();
    const router = useRouter(); // Khởi tạo router
    
    // Gọi hàm restoreCart ra
    const { restoreCart } = useCart(); 

    const status = searchParams.get("status");
    const message = searchParams.get("message");

    const [isRestoring, setIsRestoring] = useState(false);

    // ==========================================
    // HÀM HỒI SINH GIỎ HÀNG VÀ QUAY LẠI CHECKOUT
    // ==========================================
    const handleRestoreCartAndRetry = () => {
        setIsRestoring(true);
        try {
            // 1. Lôi backup từ LocalStorage ra
            const backupStr = localStorage.getItem("9trip_cart_backup");
            if (backupStr) {
                const backupItems = JSON.parse(backupStr);
                // 2. Nhét lại vào React Context
                restoreCart(backupItems);
            }
            // 3. Chuyển hướng về trang checkout để khách thấy lại giỏ hàng và thanh toán
            router.push("/checkout");
        } catch (error) {
            logger.error("Lỗi khi khôi phục giỏ hàng:", error);
            router.push("/cart"); // Lỗi thì cứ đá về cart cho an toàn
        }
    };

    // 1. NẾU ĐANG LOAD HOẶC KHÔNG CÓ STATUS
    if (!status) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner className="w-10 h-10 text-primary-600" />
            </div>
        );
    }

    // 2. NẾU THANH TOÁN THÀNH CÔNG
    if (status === "success") {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-green-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Thanh toán thành công!</h2>
                    <p className="text-gray-600 mb-6">Cảm ơn bạn đã tin tưởng 9TRIP. Vé điện tử đã được gửi vào email của bạn.</p>
                    
                    <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left border border-gray-100">
                        <p className="text-sm text-gray-500 mb-1">Mã đơn hàng của bạn:</p>
                        <p className="font-mono font-bold text-lg text-gray-800">{bookingId}</p>
                    </div>

                    <Link href="/" className="w-full block py-3 px-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200">
                        Về trang chủ
                    </Link>
                </div>
            </div>
        );
    }
    if (status === "failed") {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
                    {/* ... (Phần icon X đỏ và text báo lỗi giữ nguyên) ... */}
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Giao dịch chưa hoàn tất</h2>
                    <p className="text-gray-600 mb-6">
                        {message ? decodeURIComponent(message) : "Có lỗi xảy ra hoặc bạn đã hủy giao dịch."}
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        {/* THAY NÚT NÀY */}
                        <button 
                            onClick={handleRestoreCartAndRetry}
                            disabled={isRestoring}
                            className="w-full flex justify-center items-center py-3 px-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                        >
                            {isRestoring ? (
                                <span className="flex items-center gap-2">
                                    <LoadingSpinner className="w-5 h-5" /> Đang khôi phục đơn...
                                </span>
                            ) : "Sửa đơn & Thanh toán lại"}
                        </button>

                        <Link href="/contact" className="w-full py-3 px-4 bg-white text-gray-700 border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                            Liên hệ hỗ trợ
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
}