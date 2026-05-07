"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";

/**
 * CouponInput component for applying discount codes.
 */
export default function CouponInput() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const { applyCoupon, couponCode, removeCoupon } = useCart();

  const handleApply = async () => {
    if (!code) return;
    setLoading(true);
    setMessage({ text: "", type: "" });
    
    try {
      const result = await applyCoupon(code);
      setMessage({ 
        text: result.message, 
        type: result.success ? "success" : "error" 
      });
      if (result.success) setCode("");
    } catch (err) {
      setMessage({ text: "Có lỗi xảy ra, vui lòng thử lại", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
      <h3 className="text-sm font-bold text-foreground mb-3">Mã giảm giá</h3>
      
      {couponCode ? (
        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-100 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
              </svg>
            </span>
            <span className="text-sm font-bold text-green-700 uppercase">{couponCode}</span>
          </div>
          <button 
            onClick={removeCoupon}
            className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
          >
            Gỡ bỏ
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Nhập mã..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <button
            onClick={handleApply}
            disabled={loading || !code}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary-dark disabled:bg-surface-1 transition-colors"
          >
            {loading ? "..." : "Áp dụng"}
          </button>
        </div>
      )}
      
      {message.text && (
        <p className={`mt-2 text-xs ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
