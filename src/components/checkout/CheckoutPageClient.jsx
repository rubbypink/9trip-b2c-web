"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import CustomerForm from "@/components/checkout/CustomerForm";
import CartSummary from "@/components/checkout/CartSummary";
import CouponInput from "@/components/checkout/CouponInput";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function CheckoutPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, subtotal, tax, grandTotal, couponDiscount, couponData, clearCart } = useCart();
  
  const [step, setStep] = useState(1);
  const [contactInfo, setContactInfo] = useState(null);
  const [gateway, setGateway] = useState("VNPAY"); 
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [isValidatingPrice, setIsValidatingPrice] = useState(true);
  const [realGrandTotal, setRealGrandTotal] = useState(grandTotal);

  const showEmptyCart = items.length === 0;

  useEffect(() => {
    const validateCartPrice = async () => {
      if (items.length === 0) {
        setIsValidatingPrice(false);
        return;
      }
      
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              items: items,
              couponCode: couponData?.code || null
          })
        });
        
        const data = await res.json();
        if (data.success) {
          setRealGrandTotal(data.pricing.grandTotal); 
        } else {
          setErrorMsg(data.message); 
        }
      } catch (err) {
        setErrorMsg('Không thể xác thực giá gốc. Vui lòng tải lại trang.');
      } finally {
        setIsValidatingPrice(false);
      }
    };

    validateCartPrice();
  }, [items, couponData]);

  const handleInfoSubmit = (data) => {
    setContactInfo(data);
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleFinalizeBooking = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const bookingData = {
      userId: user?.uid || null,
      items: items,
      pricing: {
        subtotal,
        tax,
        discount: couponDiscount,
        total: grandTotal,
        currency: items[0]?.currency || "VND",
      },
      contactInfo,
      couponCode: couponData?.code || null,
    };

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: gateway,
          amount: grandTotal,
          bookingData: bookingData 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.url) {
        setIsRedirecting(true); 
        localStorage.setItem("9trip_last_booking_id", data.bookingId);
        localStorage.setItem("9trip_cart_backup", JSON.stringify(items)); 
        
        window.location.href = data.url;

        setTimeout(() => {
            clearCart();
        }, 500);
      } else {
        setErrorMsg(data.message || "Có lỗi xảy ra khi tạo link thanh toán.");
        setIsLoading(false);
        setIsRedirecting(false);
      }
    } catch (error) {
      console.error("Lỗi khi gọi API thanh toán:", error);
      setErrorMsg("Mất kết nối đến máy chủ. Vui lòng thử lại!");
      setIsLoading(false);
      setIsRedirecting(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <LoadingSpinner className="w-12 h-12 text-primary-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Đang kết nối cổng thanh toán...</h2>
        <p className="text-gray-500">Vui lòng không đóng trình duyệt trong lúc này.</p>
      </div>
    );
  }

  if (showEmptyCart) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-500 mb-8">Hãy khám phá các tour và khách sạn của chúng tôi.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/tours" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold">Khám phá Tour</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Thanh toán 9 TRIP</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Thông tin liên lạc</h2>
                <CustomerForm onSubmit={handleInfoSubmit} initialData={user} />
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    form="customer-form"
                    className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700"
                  >
                    Tiếp tục: Thanh toán
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Phương thức thanh toán</h2>
                  <button onClick={() => setStep(1)} className="text-sm text-primary-600 hover:underline">
                    Sửa thông tin
                  </button>
                </div>
                
                <div className="flex flex-col gap-3 mb-6">
                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${gateway === 'VNPAY' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <input type="radio" name="gateway" value="VNPAY" checked={gateway === 'VNPAY'} onChange={(e) => setGateway(e.target.value)} className="mr-3 w-5 h-5" />
                        <span className="font-bold text-gray-800">Thanh toán qua VNPay</span>
                    </label>

                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${gateway === 'MOMO' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                        <input type="radio" name="gateway" value="MOMO" checked={gateway === 'MOMO'} onChange={(e) => setGateway(e.target.value)} className="mr-3 w-5 h-5" />
                        <span className="font-bold text-gray-800">Thanh toán qua Ví MoMo</span>
                    </label>

                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${gateway === 'PAYPAL' ? 'border-blue-700 bg-blue-50' : 'border-gray-200'}`}>
                        <input type="radio" name="gateway" value="PAYPAL" checked={gateway === 'PAYPAL'} onChange={(e) => setGateway(e.target.value)} className="mr-3 w-5 h-5" />
                        <span className="font-bold text-gray-800">Thanh toán qua PayPal</span>
                    </label>
                </div>

                {errorMsg && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                  <button onClick={() => setStep(1)} className="text-gray-500 font-medium hover:text-gray-700">
                    Quay lại
                  </button>
                  <button
                    onClick={handleFinalizeBooking}
                    disabled={isLoading || isValidatingPrice}
                    className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {isLoading && <LoadingSpinner className="w-5 h-5 border-white" />}
                    {isLoading ? "Đang xử lý..." : `Thanh toán ${realGrandTotal.toLocaleString('vi-VN')} đ`}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <CartSummary />
            <CouponInput />
          </div>
        </div>
      </div>
    </div>
  );
}