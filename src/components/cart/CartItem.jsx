"use client";

import { formatPrice } from "@/lib/utils";

/**
 * CartItem — single row in cart page with quantity controls and remove button.
 * Uses key-based matching for hotel items (serviceId + roomId + rateType + startDate)
 * to allow precise cart sync without affecting other items.
 *
 * @param {Object} props
 * @param {Object} props.item - Cart item data
 * @param {number} props.index - Index in cart items array
 * @param {Function} props.onRemove - (index: number) => void
 * @param {Function} props.onUpdateQuantity - ({ serviceId, roomId?, rateType?, startDate }, newQty) => void
 */
export default function CartItem({ item, index, onRemove, onUpdateQuantity }) {
  const typeLabel = {
    tour: "Tour",
    hotel_room: "Khách sạn",
    hotel: "Khách sạn",
    activity: "Hoạt động",
    car: "Xe",
  }[item.serviceType] || "Dịch vụ";

  const isHotel = item.serviceType === "hotel_room";
  const quantity = item.rooms || item.adults || 1;
  const unitPrice = item.basePrice || 0;

  const guestInfo = [];
  if (item.adults > 0) guestInfo.push(`${item.adults} người lớn`);
  if (item.children > 0) guestInfo.push(`${item.children} trẻ em`);

  /**
   * Handle quantity change.
   * Uses key-based matching for hotel items to preserve cart integrity.
   * @param {number} delta
   */
  const handleQuantityChange = (delta) => {
    const newQty = Math.max(1, Math.min(10, quantity + delta));
    if (onUpdateQuantity) {
      if (isHotel && item.roomId) {
        onUpdateQuantity(
          {
            serviceId: item.serviceId,
            roomId: item.roomId,
            rateType: item.rateType,
            startDate: item.startDate,
          },
          newQty
        );
      } else {
        onUpdateQuantity(index, newQty);
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-orange-300 transition-colors">
      {/* Image */}
      <div className="w-full sm:w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
        {item.featuredImage ? (
          <img src={item.featuredImage} alt={item.serviceTitle || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
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
            <h3 className="font-semibold text-foreground truncate">
              {item.serviceTitle || "Dịch vụ"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {typeLabel}
              {item.rateType ? ` · Gói ${item.rateType.replace(/_/g, " ")}` : ""}
              {guestInfo.length > 0 && ` · ${guestInfo.join(", ")}`}
            </p>
            {item.startDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                📅 {new Date(item.startDate).toLocaleDateString("vi-VN")}
                {item.endDate && ` → ${new Date(item.endDate).toLocaleDateString("vi-VN")}`}
              </p>
            )}
          </div>
        </div>

        {/* Pricing breakdown + quantity */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            {/* Unit price */}
            <div className="text-xs text-muted-foreground">
              <span>{formatPrice(unitPrice)}</span>
              {isHotel && <span className="ml-0.5">/đêm</span>}
              {quantity > 1 && (
                <span className="ml-1 text-muted-foreground">× {quantity}</span>
              )}
            </div>

            {/* Quantity +/- */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-7 h-7 rounded border border-border flex items-center justify-center text-sm text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold text-foreground">{quantity}</span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 10}
                className="w-7 h-7 rounded border border-border flex items-center justify-center text-sm text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>

          {/* Line total */}
          <div className="flex items-center gap-3">
            <p className="text-base font-bold text-orange-600">
              {formatPrice(item.total || unitPrice * quantity || 0)}
            </p>
            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="text-sm text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
              title="Xóa"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}