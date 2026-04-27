"use client";

import { useCallback } from "react";
import { formatPrice } from "@/lib/utils/price";

/**
 * CartItem — single row in cart page with qty controls and remove.
 * @param {Object} props
 * @param {Object} props.item - { id, productType, price, quantity, meta, variantKey, date }
 * @param {Function} props.onUpdateQuantity - (itemId, newQuantity) => void
 * @param {Function} props.onRemove - (itemId) => void
 */
export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  const typeLabel = {
    tour: "Tour",
    hotel: "Khách sạn",
    activity: "Hoạt động",
    car: "Xe",
    rental: "Thuê xe",
  }[item.productType] || "Sản phẩm";

  const handleQtyChange = useCallback(
    (delta) => {
      const next = item.quantity + delta;
      if (next >= 1 && next <= 99) {
        onUpdateQuantity(item.id, next);
      }
    },
    [item, onUpdateQuantity]
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-300 transition-colors">
      {/* Image placeholder */}
      <div className="w-full sm:w-24 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0">
        {item.meta?.image ? (
          <img src={item.meta.image} alt={item.meta.title || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">
              {item.meta?.title || item.productId}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {typeLabel}
              {item.meta?.location && ` · ${item.meta.location}`}
              {item.meta?.duration && ` · ${item.meta.duration}`}
            </p>
            {item.date && (
              <p className="text-xs text-slate-500 mt-0.5">
                📅 {new Date(item.date).toLocaleDateString("vi-VN")}
              </p>
            )}
            {item.variantKey && (
              <span className="inline-block mt-1 text-[11px] bg-orange-50 text-orange-700 rounded px-2 py-0.5">
                {item.variantKey}
              </span>
            )}
          </div>
          <p className="text-base font-bold text-orange-600 shrink-0">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleQtyChange(-1)}
              disabled={item.quantity <= 1}
              className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Giảm số lượng"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
            <span className="w-10 text-center text-sm font-semibold text-slate-800">{item.quantity}</span>
            <button
              type="button"
              onClick={() => handleQtyChange(1)}
              disabled={item.quantity >= 99}
              className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Tăng số lượng"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="text-sm text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}