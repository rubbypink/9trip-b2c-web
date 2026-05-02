"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useBooking } from "@/lib/hooks/useBooking";
import AuthGuard from "@/components/auth/AuthGuard";
import CustomerForm from "@/components/checkout/CustomerForm";
import CartSummary from "@/components/checkout/CartSummary";
import CouponInput from "@/components/checkout/CouponInput";
import PaymentSelector from "@/components/checkout/PaymentSelector";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

// ─── Gateway API endpoints ────────────────────────────────────────────
const GATEWAY_ENDPOINTS = {
  vnpay: "/api/payments/vnpay/create",
  momo: "/api/payments/momo/create",
  paypal: "/api/payments/paypal/create",
};

/**
 * Checkout Page component handling the multi-step flow.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, subtotal, tax, grandTotal, couponDiscount, couponData, clearCart } = useCart();
  const { startCheckout, confirmBooking, loading: bookingLoading, error: bookingError } = useBooking();
  
  const [step, setStep] = useState(1); // 1: Info, 2: Payment
  const [contactInfo, setContactInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("vnpay");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  // Merge error from hook + local error state
  const displayError = checkoutError || bookingError;

  // Show empty state if cart is empty and not loading
  const showEmptyCart = items.length === 0 && !bookingLoading;

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

  /**
   * Send booking data to the payment gateway API route.
   * The API creates the booking (pending) and returns the gateway URL.
   * @param {Object} bookingData
   */
  const redirectToGateway = async (bookingData) => {
    const endpoint = GATEWAY_ENDPOINTS[paymentMethod];
    if (!endpoint) return;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingData }),
    });

    const data = await res.json();

    if (data.error) {
      setCheckoutError(data.error);
      return;
    }

    // Store bookingId for return page (API creates booking + returns the ID)
    if (data.bookingId) {
      localStorage.setItem("9trip_last_booking_id", data.bookingId);
    }
    if (paymentMethod === "paypal" && data.orderId) {
      localStorage.setItem("9trip_paypal_order_id", data.orderId);
    }

    // Clear cart before redirect (booking is created by the API)
    clearCart();

    // Redirect to gateway payment page
    const redirectUrl = data.paymentUrl || data.approvalUrl;
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  const handleFinalizeBooking = async () => {
    setPaymentLoading(true);
    setCheckoutError(null);

    // Cash: use existing confirmBooking flow (creates booking + goes to confirmation)
    if (paymentMethod === "cash") {
      const id = await confirmBooking(contactInfo, paymentMethod);
      if (id) {
        router.push(`/booking/confirmation/${id}`);
      }
      setPaymentLoading(false);
      return;
    }

    // Gateway payments: API creates the booking + returns gateway URL
    const item = items[0];
    await redirectToGateway({
      userId: user?.uid,
      serviceId: item?.serviceId,
      serviceType: item?.serviceType,
      startDate: item?.startDate,
      endDate: item?.endDate || null,
      guests: {
        adults: item?.adults || 1,
        children: item?.children || 0,
        infants: item?.infants || 0,
      },
      pricing: {
        subtotal,
        tax,
        discount: couponDiscount,
        total: grandTotal,
        currency: item?.currency || "VND",
      },
      contactInfo,
      paymentGateway: paymentMethod,
      couponCode: couponData?.code || null,
    });

    setPaymentLoading(false);
  };

  if (showEmptyCart) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
            <p className="text-gray-500 mb-8">Bạn chưa chọn dịch vụ nào. Hãy khám phá các tour và khách sạn của chúng tôi.</p>
            <div className="flex gap-4 justify-center">
              <Link href="/tours" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all">
                Khám phá Tour
              </Link>
              <Link href="/hotels" className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all">
                Khám phá Khách sạn
              </Link>
            </div>
          </div>
        </div>
    );
  }

  return (
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
                  
                  {displayError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                      {displayError}
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
                      disabled={bookingLoading || paymentLoading}
                      className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none flex items-center gap-2"
                    >
                      {(bookingLoading || paymentLoading) && <LoadingSpinner className="w-4 h-4 border-white" />}
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
  );
}
