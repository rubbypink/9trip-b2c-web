'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart';
import CartItem from '@/components/cart/CartItem';
import Link from 'next/link';
import { logger } from '@/lib/logger';

/**
 * CartPage — hiển thị giỏ hàng với quantity controls, coupon, và tổng tiền.
 */
export default function CartPage() {
  const { items, removeItem, updateItemQuantity, clearCart, subtotal, itemCount, applyCoupon, removeCoupon, couponCode, couponDiscount, couponData, tax, grandTotal } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [couponSuccess, setCouponSuccess] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const result = await applyCoupon(couponInput.trim());
      setCouponMsg(result.message);
      setCouponSuccess(result.success);
    } catch (error) {
      logger.error('[CartPage] Error applying coupon:', error.message);
      setCouponMsg('Lỗi khi áp dụng mã giảm giá. Vui lòng thử lại.');
      setCouponSuccess(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponInput('');
    setCouponMsg('');
    setCouponSuccess(false);
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <svg className="h-7 w-7 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Giỏ hàng của bạn
          </h1>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto h-20 w-20 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-muted-foreground">Giỏ hàng trống</h2>
            <p className="mt-2 text-muted-foreground text-sm">Hãy thêm một số chuyến đi, khách sạn hoặc hoạt động vào giỏ hàng</p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 text-white px-6 py-3 font-semibold text-sm hover:bg-orange-700 transition-colors">
              Tiếp tục khám phá
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Items */}
            <div className="flex-1 space-y-4">
              {items.map((item, idx) => (
                <CartItem
                  key={idx}
                  item={item}
                  index={idx}
                  onRemove={removeItem}
                  onUpdateQuantity={updateItemQuantity}
                />
              ))}

              {/* Coupon Section */}
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Mã giảm giá</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Nhập mã giảm giá"
                    disabled={!!couponCode}
                    className="flex-1 rounded-lg border border-border px-4 py-2 text-sm outline-none focus:border-orange-500 disabled:bg-muted"
                  />
                  {couponCode ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Hủy
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim()}
                      className="rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                      Áp dụng
                    </button>
                  )}
                </div>
                {couponMsg && (
                  <p className={`text-xs mt-2 ${couponSuccess ? 'text-green-600' : 'text-red-500'}`}>
                    {couponMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="lg:w-80">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4 sticky top-24">
                <h3 className="text-lg font-bold text-foreground">Tổng đơn hàng</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tạm tính ({itemCount} sản phẩm)</span>
                    <span className="font-semibold text-foreground">{subtotal.toLocaleString()}đ</span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Giảm giá</span>
                      <span className="font-semibold">-{couponDiscount.toLocaleString()}đ</span>
                    </div>
                  )}

                  <div className="flex justify-between text-muted-foreground">
                    <span>Thuế (8%)</span>
                    <span className="font-semibold">{tax.toLocaleString()}đ</span>
                  </div>

                  <hr className="border-border" />

                  <div className="flex justify-between text-base font-bold">
                    <span className="text-foreground">Tổng cộng</span>
                    <span className="text-orange-600 text-lg">{grandTotal.toLocaleString()}đ</span>
                  </div>

                  {couponCode && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="text-xs text-green-700 font-medium">
                        🎉 Đã áp dụng mã: <strong>{couponCode}</strong>
                      </p>
                      {couponData?.type === 'percent' && (
                        <p className="text-xs text-green-600 mt-0.5">Giảm {couponData.amount}%</p>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href="/checkout"
                  className="block w-full text-center rounded-xl bg-orange-600 text-white py-3 font-bold text-sm hover:bg-orange-700 transition-colors"
                >
                  Tiến hành đặt chỗ
                </Link>
                <p className="text-xs text-center text-muted-foreground">
                  Bạn sẽ không bị tính tiền ngay bây giờ
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
