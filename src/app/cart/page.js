"use client";

import { useCart } from "@/components/cart/CartProvider";
import CartItem from "@/components/cart/CartItem";
import CartSummary from "@/components/cart/CartSummary";
import { calcTotal } from "@/lib/utils/price";
import Link from "next/link";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();

  const totalPrice = calcTotal(items);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="h-7 w-7 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            Giỏ hàng của bạn
          </h1>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto h-20 w-20 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-slate-600">Giỏ hàng trống</h2>
            <p className="mt-2 text-slate-400 text-sm">
              Hãy thêm một số chuyến đi, khách sạn hoặc hoạt động vào giỏ hàng
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 text-white px-6 py-3 font-semibold text-sm hover:bg-orange-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Tiếp tục khám phá
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Items */}
            <div className="flex-1 space-y-4">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>

            {/* Summary sidebar */}
            <div className="lg:w-80">
              <CartSummary totalItems={totalItems} totalPrice={totalPrice} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}