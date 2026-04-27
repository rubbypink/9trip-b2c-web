"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useBooking } from "@/lib/hooks/useBooking";
import AuthGuard from "@/components/auth/AuthGuard";
import CustomerForm from "@/components/checkout/CustomerForm";
import CartSummary from "@/components/checkout/CartSummary";
import CouponInput from "@/components/checkout/CouponInput";
import PaymentSelector from "@/components/checkout/PaymentSelector";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

/**
 * Checkout Page component handling the multi-step flow.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items } = useCart();
  const { startCheckout, confirmBooking, loading: bookingLoading, error: bookingError } = useBooking();
  
  const [step, setStep] = useState(1); // 1: Info, 2: Payment
  const [contactInfo, setContactInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !bookingLoading) {
      // router.push("/tours");
    }
  }, [items, router, bookingLoading]);

  // Start checkout hold when component mounts or step 1 starts
  useEffect(() => {
    if (step === 1 && items.length > 0) {
      startCheckout();
    }
  }, [step, items.length, startCheckout]);

  const handleInfoSubmit = (data) => {
    setContactInfo(data);
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleFinalizeBooking = async () => {
    const id = await confirmBooking(contactInfo, paymentMethod);
    if (id) {
      router.push(`/booking/confirmation/${id}`);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Thanh toán</h1>
            <div className="flex items-center justify-center mt-4 gap-4 text-sm font-medium">
              <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary-600" : "text-gray-400"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step >= 1 ? "border-primary-600 bg-primary-50" : "border-gray-300"}`}>1</span>
                Thông tin khách hàng
              </div>
              <div className="w-10 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary-600" : "text-gray-400"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${step >= 2 ? "border-primary-600 bg-primary-50" : "border-gray-300"}`}>2</span>
                Thanh toán
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Form Steps */}
            <div className="lg:col-span-2 space-y-6">
              {step === 1 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Thông tin liên lạc</h2>
                  <CustomerForm onSubmit={handleInfoSubmit} initialData={user} />
                  <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                    <button
                      type="submit"
                      form="customer-form"
                      className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
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
                    <button 
                      onClick={() => setStep(1)} 
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Sửa thông tin liên lạc
                    </button>
                  </div>
                  
                  <PaymentSelector selected={paymentMethod} onChange={setPaymentMethod} />
                  
                  {bookingError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                      {bookingError}
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                    <button
                      onClick={() => setStep(1)}
                      className="text-gray-500 font-medium hover:text-gray-700"
                    >
                      Quay lại
                    </button>
                    <button
                      onClick={handleFinalizeBooking}
                      disabled={bookingLoading}
                      className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:bg-gray-300 flex items-center gap-2"
                    >
                      {bookingLoading && <LoadingSpinner className="w-4 h-4 border-white" />}
                      {paymentMethod === "cash" ? "Hoàn tất đặt chỗ" : "Thanh toán ngay"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Summary */}
            <div className="space-y-6">
              <CartSummary />
              <CouponInput />
              
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <div className="text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Bằng cách nhấn nút thanh toán, bạn đồng ý với các Điều khoản & Chính sách của 9Trip.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
