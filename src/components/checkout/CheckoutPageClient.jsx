"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useBooking } from "@/hooks/useBooking";
import CustomerForm from "@/components/checkout/CustomerForm";
import CartSummary from "@/components/checkout/CartSummary";
import CouponInput from "@/components/checkout/CouponInput";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export default function CheckoutPageClient() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { items, subtotal, tax, grandTotal, couponDiscount, couponData, clearCart } = useCart();
  const { confirmBooking } = useBooking();
  
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

    if (gateway === "CASH" || gateway === "BANK_TRANSFER") {
      try {
        const id = await confirmBooking(contactInfo, gateway);
        if (id) {
          router.push(`/booking/confirmation/${id}`);
        } else {
          setErrorMsg("Có lỗi xảy ra khi tạo booking.");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Lỗi khi tạo booking:", err);
        setErrorMsg("Mất kết nối đến máy chủ. Vui lòng thử lại!");
        setIsLoading(false);
      }
      return;
    }

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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <LoadingSpinner className="w-12 h-12 text-primary-600 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Đang kết nối cổng thanh toán...</h2>
        <p className="text-muted-foreground">Vui lòng không đóng trình duyệt trong lúc này.</p>
      </div>
    );
  }

  if (showEmptyCart) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-bold text-foreground mb-2">Giỏ hàng trống</h2>
          <p className="text-muted-foreground mb-8">Hãy khám phá các tour và khách sạn của chúng tôi.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/tours" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold">Khám phá Tour</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Thanh toán 9 TRIP</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <h2 className="text-xl font-bold text-foreground mb-6">Thông tin liên lạc</h2>
                <CustomerForm onSubmit={handleInfoSubmit} initialData={profile || user} />
                <div className="mt-8 pt-6 border-t border-border flex justify-end">
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
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground">Phương thức thanh toán</h2>
                  <button onClick={() => setStep(1)} className="text-sm text-primary-600 hover:underline">
                    Sửa thông tin
                  </button>
                </div>
                
                <div className="flex flex-col gap-3 mb-6">
                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${gateway === 'VNPAY' ? 'border-blue-500 bg-blue-50' : 'border-border'}`}>
                        <input type="radio" name="gateway" value="VNPAY" checked={gateway === 'VNPAY'} onChange={(e) => setGateway(e.target.value)} className="mr-3 w-5 h-5" />
                        <span className="font-bold text-foreground">Thanh toán qua VNPay</span>
                    </label>

                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${gateway === 'MOMO' ? 'border-pink-500 bg-pink-50' : 'border-border'}`}>
                        <input type="radio" name="gateway" value="MOMO" checked={gateway === 'MOMO'} onChange={(e) => setGateway(e.target.value)} className="mr-3 w-5 h-5" />
                        <span className="font-bold text-foreground">Thanh toán qua Ví MoMo</span>
                    </label>

                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${gateway === 'PAYPAL' ? 'border-blue-700 bg-blue-50' : 'border-border'}`}>
                        <input type="radio" name="gateway" value="PAYPAL" checked={gateway === 'PAYPAL'} onChange={(e) => setGateway(e.target.value)} className="mr-3 w-5 h-5" />
                        <span className="font-bold text-foreground">Thanh toán qua PayPal</span>
                    </label>

                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${gateway === 'CASH' ? 'border-emerald-500 bg-emerald-50' : 'border-border'}`}>
                        <input type="radio" name="gateway" value="CASH" checked={gateway === 'CASH'} onChange={(e) => setGateway(e.target.value)} className="mr-3 w-5 h-5" />
                        <span className="font-bold text-foreground">Thanh toán tiền mặt tại văn phòng</span>
                    </label>

                    <div className={`flex flex-col border rounded-xl transition-colors ${gateway === 'BANK_TRANSFER' ? 'border-emerald-500 bg-emerald-50' : 'border-border'}`}>
                        <label className="flex items-center p-4 cursor-pointer">
                            <input type="radio" name="gateway" value="BANK_TRANSFER" checked={gateway === 'BANK_TRANSFER'} onChange={(e) => setGateway(e.target.value)} className="mr-3 w-5 h-5" />
                            <span className="font-bold text-foreground">Chuyển khoản ngân hàng (QR Code)</span>
                        </label>
                        {gateway === 'BANK_TRANSFER' && (
                            <div className="px-4 pb-4 pt-0">
                                <div className="bg-white p-4 rounded-lg border border-emerald-100 flex flex-col md:flex-row gap-4 items-center">
                                    <div className="w-32 h-32 bg-muted rounded border flex items-center justify-center shrink-0">
                                      <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-5m-2.5 0c2.071.816 4.014 1.2 6.5 1.2s4.429-.384 6.5-1.2M21 10c0 4.556-4.03 8.25-9 8.25s-9-3.694-9-8.25V7c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v3z" />
                                      </svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Ngân hàng: Vietcombank</p>
                                        <p className="font-bold text-sm">Số tài khoản: 0123456789</p>
                                        <p className="font-bold text-sm">Chủ tài khoản: CÔNG TY TNHH 9 TRIP</p>
                                        <p className="text-xs text-muted-foreground mt-2">Vui lòng quét mã QR hoặc chuyển khoản với nội dung: <br/><strong className="text-foreground">Thanh toan 9TRIP {contactInfo?.phone}</strong></p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {errorMsg && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
                  <button onClick={() => setStep(1)} className="text-muted-foreground font-medium hover:text-foreground">
                    Quay lại
                  </button>
                  <button
                    onClick={handleFinalizeBooking}
                    disabled={isLoading || isValidatingPrice}
                    className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:bg-surface-1 flex items-center gap-2"
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