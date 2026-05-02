"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/cart";

/**
 * HotelBookingWidget — Booking form sidebar cho hotel detail.
 * Tích hợp per-room increment/decrement, auto-calc total, auto-sync cart.
 * Nhận pricingTable từ HotelDetailClient (giống RoomsPanel).
 *
 * Features:
 * - Date picker: Check-in / Check-out (auto tính nights)
 * - Per-room quantity với +/- buttons (chỉ hiển thị room có qty > 0, toggle show all)
 * - Price breakdown per room: giá × số lượng × số đêm
 * - Grand total real-time
 * - Auto-sync cart với debounce (cập nhật khi quantity/date thay đổi)
 * - "Đặt ngay" CTA + "Gọi tư vấn" CTA
 *
 * @param {{
 *   hotel: Object,              // Full hotel object (id, name, featuredImage...)
 *   pricingTable: Array<Object>, // Từ buildRoomPricingTable (chứa rooms + rateTypes)
 *   checkIn: string,            // YYYY-MM-DD
 *   checkOut: string,           // YYYY-MM-DD
 *   nights: number,
 *   onDateChange: (checkIn: string, checkOut: string) => void,
 * }} props
 */
export default function HotelBookingWidget({ hotel = {}, pricingTable = [], checkIn: initCheckIn = "", checkOut: initCheckOut = "", nights: initNights = 1, onDateChange }) {
  const router = useRouter();
  const { addItem, updateCartItem, removeCartItemByKey } = useCart();
  const debounceRef = useRef(null);

  // ── Date state ───────────────────────────────────────────
  const [checkIn, setCheckIn] = useState(initCheckIn);
  const [checkOut, setCheckOut] = useState(initCheckOut);

  // ── Per-room quantity state ──────────────────────────────
  // Key: roomId, value: quantity (chỉ 1 rate type đầu tiên)
  const [quantities, setQuantities] = useState({});

  // ── Min date ─────────────────────────────────────────────
  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ── Computed nights ──────────────────────────────────────
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return initNights || 1;
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const diff = Math.max(1, Math.round((co - ci) / (1000 * 60 * 60 * 24)));
    return diff;
  }, [checkIn, checkOut, initNights]);

  // ── Only show active rooms in widget ─────────────────────
  const activeRooms = useMemo(() => pricingTable.filter((r) => r.isActive), [pricingTable]);

  // ── Per-room quantities helper ───────────────────────────
  const getRoomQty = useCallback((roomId) => quantities[roomId] || 0, [quantities]);

  const updateRoomQty = useCallback((roomId, delta) => {
    setQuantities((prev) => {
      const current = prev[roomId] || 0;
      const room = pricingTable.find((r) => r.roomId === roomId);
      const maxRooms = room?.totalRooms || 10;
      const next = Math.max(0, Math.min(maxRooms, current + delta));
      return { ...prev, [roomId]: next };
    });
  }, [pricingTable]);

  // ── Cart sync: quantity change → auto-update cart ────────
  const syncCart = useCallback(() => {
    if (!hotel.id) return;
    for (const room of activeRooms) {
      const qty = getRoomQty(room.roomId);
      // Use the first rateType for pricing
      const rt = room.rateTypes && room.rateTypes.length > 0 ? room.rateTypes[0] : null;
      const roomPrice = rt ? rt.avgSellPrice : 0;
      const lineTotal = roomPrice * nights * qty;
      const key = `${room.roomId}_${rt ? rt.rateType : 'standard'}`;

      if (qty > 0 && rt) {
        updateCartItem({
          serviceId: hotel.id,
          roomId: room.roomId,
          rateType: rt.rateType,
          serviceType: "hotel_room",
          serviceTitle: `${hotel.name || ''} — ${room.roomName}`,
          featuredImage: room.featuredImage || hotel.featuredImage || "",
          startDate: checkIn || minDate,
          endDate: checkOut || "",
          adults: 2,
          children: 0,
          infants: 0,
          rooms: qty,
          basePrice: roomPrice,
          costPrice: rt.dailyPrices?.[0]?.costPrice || 0,
          discount: 0,
          total: lineTotal,
          currency: "VND",
          hotelId: hotel.id,
          hotelName: hotel.name || '',
          roomName: room.roomName,
        });
      } else {
        // Remove from cart if qty = 0 and was previously added
        removeCartItemByKey({
          serviceId: hotel.id,
          roomId: room.roomId,
          rateType: rt ? rt.rateType : 'standard',
          startDate: checkIn || minDate,
        });
      }
    }
  }, [activeRooms, getRoomQty, nights, updateCartItem, removeCartItemByKey, hotel, checkIn, checkOut, minDate]);

  // Debounced cart sync (500ms)
  const debouncedSync = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncCart();
    }, 500);
  }, [syncCart]);

  // Sync when quantity or dates change
  useEffect(() => {
    debouncedSync();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [quantities, checkIn, checkOut, nights, debouncedSync]);

  // ── Grand total ──────────────────────────────────────────
  const grandTotal = useMemo(() => {
    let total = 0;
    for (const room of activeRooms) {
      const qty = getRoomQty(room.roomId);
      if (qty === 0) continue;
      const rt = room.rateTypes && room.rateTypes.length > 0 ? room.rateTypes[0] : null;
      if (rt) {
        total += rt.avgSellPrice * nights * qty;
      }
    }
    return total;
  }, [activeRooms, getRoomQty, nights]);

  // ── Has any selection ────────────────────────────────────
  const hasSelection = useMemo(() => {
    return Object.values(quantities).some((q) => q > 0);
  }, [quantities]);

  // ── Sync local dates to parent when they change ──────────
  const syncDatesToParent = useCallback((newCheckIn, newCheckOut) => {
    if (onDateChange) {
      onDateChange(newCheckIn || checkIn, newCheckOut || checkOut);
    }
  }, [onDateChange, checkIn, checkOut]);

  // ── Handle check-in change ───────────────────────────────
  const handleCheckInChange = useCallback((e) => {
    const val = e.target.value;
    setCheckIn(val);
    let newCheckOut = checkOut;
    if (!checkOut || val >= checkOut) {
      const ci = new Date(val);
      ci.setDate(ci.getDate() + 1);
      newCheckOut = ci.toISOString().split("T")[0];
      setCheckOut(newCheckOut);
    }
    syncDatesToParent(val, newCheckOut);
  }, [checkOut, syncDatesToParent]);

  // ── Handle check-out change ──────────────────────────────
  const handleCheckOutChange = useCallback((e) => {
    const val = e.target.value;
    setCheckOut(val);
    syncDatesToParent(checkIn, val);
  }, [checkIn, syncDatesToParent]);

  // ── Handle book now ──────────────────────────────────────
  const handleBookNow = useCallback(() => {
    // Ensure cart is up-to-date before navigating
    syncCart();
    // Small delay to let cart state update
    setTimeout(() => {
      router.push("/checkout");
    }, 100);
  }, [syncCart, router]);

  // ── Handle consult ───────────────────────────────────────
  const handleConsult = useCallback(() => {
    const phone = "0877.901.901";
    window.open(`tel:${phone.replace(/[^0-9]/g, "")}`, "_self");
  }, []);

  // ── Price header value ───────────────────────────────────
  const lowestPrice = useMemo(() => {
    if (activeRooms.length === 0) return 0;
    const prices = activeRooms.flatMap((r) =>
      (r.rateTypes || []).map((rt) => rt.avgSellPrice)
    ).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [activeRooms]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Price Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Giá từ</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {lowestPrice > 0 ? formatCurrency(lowestPrice, "VND") : "Liên hệ"}
          </span>
          <span className="text-sm text-gray-500">/ đêm</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Check-in / Check-out */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Nhận phòng</label>
            <input
              type="date"
              value={checkIn}
              onChange={handleCheckInChange}
              min={minDate}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Trả phòng</label>
            <input
              type="date"
              value={checkOut}
              onChange={handleCheckOutChange}
              min={checkIn || minDate}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Room Quantity per room type */}
        {activeRooms.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Chọn phòng <span className="text-gray-400 font-normal">(+ để thêm)</span>
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeRooms.map((room) => {
                const qty = getRoomQty(room.roomId);
                const rt = room.rateTypes && room.rateTypes.length > 0 ? room.rateTypes[0] : null;
                const roomPrice = rt ? rt.avgSellPrice : 0;
                const lineTotal = roomPrice * nights * qty;
                const isSelected = qty > 0;

                return (
                  <div
                    key={room.roomId}
                    className={`rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Mini image */}
                      {room.featuredImage && (
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                          <Image src={room.featuredImage} alt={room.roomName} fill className="object-cover" sizes="40px" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{room.roomName}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => updateRoomQty(room.roomId, -1)}
                              disabled={qty === 0}
                              className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              −
                            </button>
                            <span className="w-7 text-center text-sm font-semibold text-gray-900 tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateRoomQty(room.roomId, 1)}
                              disabled={qty >= (room.totalRooms || 10)}
                              className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Price info */}
                        <div className="flex items-center gap-2 mt-0.5">
                          {roomPrice > 0 && (
                            <span className="text-xs font-semibold text-blue-600">
                              {formatCurrency(roomPrice, "VND")}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">/đêm</span>
                          {room.bedType && (
                            <span className="text-xs text-gray-400">· {room.bedType}</span>
                          )}
                        </div>

                        {/* Line total when selected */}
                        {isSelected && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatCurrency(roomPrice, "VND")} × {qty} phòng × {nights} đêm
                            <span className="text-primary font-semibold ml-1">
                              = {formatCurrency(lineTotal, "VND")}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {activeRooms.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Chưa có thông tin phòng</p>
          </div>
        )}

        {/* Price Breakdown */}
        {hasSelection && (
          <div className="border-t border-gray-100 pt-4">
            <div className="space-y-2 text-sm">
              {activeRooms.map((room) => {
                const qty = getRoomQty(room.roomId);
                if (qty === 0) return null;
                const rt = room.rateTypes && room.rateTypes.length > 0 ? room.rateTypes[0] : null;
                const roomPrice = rt ? rt.avgSellPrice : 0;
                const lineTotal = roomPrice * nights * qty;
                return (
                  <div key={room.roomId} className="flex items-center justify-between text-gray-600">
                    <span className="text-xs truncate max-w-[180px]">
                      {room.roomName} × {qty}
                    </span>
                    <span className="text-xs font-medium text-gray-800">
                      {formatCurrency(lineTotal, "VND")}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(grandTotal, "VND")}
                </span>
              </div>
              <p className="text-xs text-gray-400 text-right">{nights} đêm</p>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={handleBookNow}
            disabled={!hasSelection}
            className="w-full rounded-xl bg-primary text-white font-semibold text-sm px-6 py-3.5 hover:bg-primary-dark transition-colors shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hasSelection ? `Đặt ngay — ${formatCurrency(grandTotal, "VND")}` : 'Vui lòng chọn phòng'}
          </button>
          <button
            onClick={handleConsult}
            className="w-full rounded-xl border-2 border-gray-200 text-gray-700 font-medium text-sm px-6 py-3 hover:border-primary hover:text-primary transition-colors"
          >
            📞 Gọi tư vấn: 0877.901.901
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          🔒 Miễn phí hủy &bull; Thanh toán an toàn
        </p>
      </div>
    </div>
  );
}