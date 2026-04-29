"use client";

import { formatPrice } from "@/lib/utils";

/**
 * CartItem — single row in cart page with remove button.
 * Works with the Context-based cart from @/lib/cart.
 * @param {Object} props
 * @param {Object} props.item - { serviceType, serviceTitle, featuredImage, adults, children, basePrice, discount, total, startDate, endDate, currency }
 * @param {number} props.index - Index in cart items array (for removeItem)
 * @param {Function} props.onRemove - (index: number) => void
 */
export default function CartItem({ item, index, onRemove }) {
  const typeLabel = {
    tour: "Tour",
    hotel_room: "Khách sạn",
    hotel: "Khách sạn",
    activity: "Hoạt động",
    car: "Xe",
  }[item.serviceType] || "Dịch vụ";

  const guestInfo = [];
  if (item.adults > 0) guestInfo.push(`${item.adults} người lớn`);
  if (item.children > 0) guestInfo.push(`${item.children} trẻ em`);
  if (item.infants > 0) guestInfo.push(`${item.infants} em bé`);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-300 transition-colors">
      {/* Image */}
      <div className="w-full sm:w-24 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0">
        {item.featuredImage ? (
          <img src={item.featuredImage} alt={item.serviceTitle || ""} className="w-full h-full object-cover" />
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
              {item.serviceTitle || "Dịch vụ"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {typeLabel}
              {guestInfo.length > 0 && ` · ${guestInfo.join(", ")}`}
            </p>
            {item.startDate && (
              <p className="text-xs text-slate-500 mt-0.5">
                📅 {new Date(item.startDate).toLocaleDateString("vi-VN")}
                {item.endDate && ` → ${new Date(item.endDate).toLocaleDateString("vi-VN")}`}
              </p>
            )}
            {item.rooms > 1 && (
              <span className="inline-block mt-1 text-[11px] bg-orange-50 text-orange-700 rounded px-2 py-0.5">
                {item.rooms} phòng
              </span>
            )}
          </div>
          <p className="text-base font-bold text-orange-600 shrink-0">
            {formatPrice(item.total || item.basePrice || 0)}
          </p>
        </div>

        {/* Remove button */}
        <div className="flex items-center justify-end mt-3">
          <button
            type="button"
            onClick={() => onRemove(index)}
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