"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";
import { formatPrice } from "@/lib/utils/price";

/**
 * MiniCart — dropdown cart preview in navbar.
 * Shows item count badge, hover/popover with last 3 items + go-to-cart link.
 */
export default function MiniCart() {
  const { cart, totalItems, totalPrice, removeItem } = useCart();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const displayed = cart.slice(0, 3);
  const more = cart.length - displayed.length;

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleRemove = useCallback(
    (e, id) => {
      e.stopPropagation();
      e.preventDefault();
      removeItem(id);
    },
    [removeItem]
  );

  return (
    <div ref={ref} className="relative">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-slate-700 hover:text-orange-500 transition-colors"
        aria-label="Giỏ hàng"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        {totalItems > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-orange-600 text-white text-[10px] font-bold leading-none">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">
              Giỏ hàng ({totalItems} sản phẩm)
            </p>
          </div>

          {cart.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              <svg className="mx-auto h-10 w-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Giỏ hàng trống
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {displayed.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {item.meta?.title || item.productId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                    {item.variantKey && (
                      <span className="inline-block text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 mt-1">
                        {item.variantKey}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, item.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    aria-label="Xóa"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
              {more > 0 && (
                <li className="p-3 text-center text-xs text-slate-400">
                  + {more} sản phẩm khác
                </li>
              )}
            </ul>
          )}

          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tạm tính:</span>
                <span className="font-semibold text-slate-800">{formatPrice(totalPrice)}</span>
              </div>
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="block w-full text-center rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 transition-colors"
              >
                Xem giỏ hàng
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}