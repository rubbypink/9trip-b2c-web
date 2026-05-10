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
export default function HotelBookingWidget({ hotel = {}, pricingTable = [], checkIn = "", checkOut = "", nights = 1, onDateChange, roomQuantities = {}, onRoomQuantityChange }) {
  const router = useRouter();
  const { updateCartItem, removeCartItemByKey } = useCart();
  const debounceRef = useRef(null);

  // ── Min date ─────────────────────────────────────────────
  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // ── Only show active rooms in widget ─────────────────────
  const activeRooms = useMemo(() => {
    try {
      return (pricingTable || []).filter((r) => r?.isActive);
    } catch (e) {
      console.error('[HotelBookingWidget] Error filtering activeRooms:', e);
      return [];
    }
  }, [pricingTable]);

  // ── Per-room quantities helper ───────────────────────────
  // We use the first rateType as default for the widget
  const getFirstRateType = useCallback((room) => {
    return Array.isArray(room?.rateTypes) && room.rateTypes.length > 0 ? room.rateTypes[0].rateType : 'standard';
  }, []);

  const getRoomQty = useCallback((roomId, rateType) => {
    const key = `${roomId}_${rateType}`;
    return roomQuantities?.[key] || 0;
  }, [roomQuantities]);

  const updateRoomQty = useCallback((roomId, delta) => {
    try {
      const room = (pricingTable || []).find((r) => r?.roomId === roomId);
      if (!room) return;
      const rateType = getFirstRateType(room);
      const maxRooms = room.totalRooms || 10;
      if (onRoomQuantityChange) {
        onRoomQuantityChange(roomId, rateType, delta, maxRooms);
      }
    } catch (e) {
      console.error('[HotelBookingWidget] Error updating room qty:', e);
    }
  }, [pricingTable, onRoomQuantityChange, getFirstRateType]);

  // ── Cart sync: quantity change → auto-update cart ────────
  const syncCart = useCallback(() => {
    try {
      if (!hotel?.id) return;
      for (const room of activeRooms) {
        const rt = Array.isArray(room?.rateTypes) && room.rateTypes.length > 0 ? room.rateTypes[0] : null;
        const rateType = rt ? rt.rateType : 'standard';
        const qty = getRoomQty(room.roomId, rateType);
        const roomPrice = rt ? rt.avgSellPrice : 0;
        const lineTotal = roomPrice * nights * qty;

        if (qty > 0 && rt) {
          updateCartItem({
            serviceId: hotel.id,
            roomId: room.roomId,
            rateType: rt.rateType,
            serviceType: "hotel_room",
            serviceTitle: `${hotel.name || ''} — ${room.roomName || ''}`,
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
            roomName: room.roomName || '',
          });
        } else {
          removeCartItemByKey({
            serviceId: hotel.id,
            roomId: room.roomId,
            rateType: rateType,
            startDate: checkIn || minDate,
          });
        }
      }
    } catch (e) {
      console.error('[HotelBookingWidget] Error syncing cart:', e);
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
  }, [roomQuantities, checkIn, checkOut, nights, debouncedSync]);

  // ── Grand total ──────────────────────────────────────────
  const grandTotal = useMemo(() => {
    try {
      let total = 0;
      for (const room of activeRooms) {
        const rateType = getFirstRateType(room);
        const qty = getRoomQty(room?.roomId, rateType);
        if (qty === 0) continue;
        const rt = Array.isArray(room?.rateTypes) && room.rateTypes.length > 0 ? room.rateTypes[0] : null;
        if (rt) {
          total += (rt.avgSellPrice || 0) * nights * qty;
        }
      }
      return total;
    } catch (e) {
      console.error('[HotelBookingWidget] Error calculating grandTotal:', e);
      return 0;
    }
  }, [activeRooms, getRoomQty, nights, getFirstRateType]);

  // ── Has any selection ────────────────────────────────────
  const hasSelection = useMemo(() => {
    try {
      return Object.entries(roomQuantities || {}).some(([key, qty]) => qty > 0);
    } catch (e) {
      return false;
    }
  }, [roomQuantities]);

  // ── Handle check-in change ───────────────────────────────
  const handleCheckInChange = useCallback((e) => {
    const val = e.target.value;
    let newCheckOut = checkOut;
    if (!checkOut || val >= checkOut) {
      const ci = new Date(val);
      ci.setDate(ci.getDate() + 1);
      newCheckOut = ci.toISOString().split("T")[0];
    }
    if (onDateChange) onDateChange(val, newCheckOut);
  }, [checkOut, onDateChange]);

  // ── Handle check-out change ──────────────────────────────
  const handleCheckOutChange = useCallback((e) => {
    const val = e.target.value;
    if (onDateChange) onDateChange(checkIn, val);
  }, [checkIn, onDateChange]);

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
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Price Header */}
      <div className="p-5 border-b border-border">
        <div className="text-sm text-muted-foreground mb-1">Giá từ</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">
            {lowestPrice > 0 ? formatCurrency(lowestPrice, "VND") : "Liên hệ"}
          </span>
          <span className="text-sm text-muted-foreground">/ đêm</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Check-in / Check-out */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Nhận phòng</label>
            <input
              type="date"
              value={checkIn}
              onChange={handleCheckInChange}
              min={minDate}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Trả phòng</label>
            <input
              type="date"
              value={checkOut}
              onChange={handleCheckOutChange}
              min={checkIn || minDate}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Room Quantity per room type */}
        {activeRooms.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Chọn phòng <span className="text-muted-foreground font-normal">(+ để thêm)</span>
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
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Mini image */}
                      {room.featuredImage && (
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <Image src={room.featuredImage} alt={room.roomName} fill className="object-cover" sizes="40px" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-medium text-foreground truncate">{room.roomName}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => updateRoomQty(room.roomId, -1)}
                              disabled={qty === 0}
                              className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              −
                            </button>
                            <span className="w-7 text-center text-sm font-semibold text-foreground tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateRoomQty(room.roomId, 1)}
                              disabled={qty >= (room.totalRooms || 10)}
                              className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
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
                          <span className="text-xs text-muted-foreground">/đêm</span>
                          {room.bedType && (
                            <span className="text-xs text-muted-foreground">· {room.bedType}</span>
                          )}
                        </div>

                        {/* Line total when selected */}
                        {isSelected && (
                          <p className="text-xs text-muted-foreground mt-1">
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
            <p className="text-sm text-muted-foreground">Chưa có thông tin phòng</p>
          </div>
        )}

        {/* Price Breakdown */}
        {hasSelection && (
          <div className="border-t border-border pt-4">
            <div className="space-y-2 text-sm">
              {activeRooms.map((room) => {
                const qty = getRoomQty(room.roomId);
                if (qty === 0) return null;
                const rt = room.rateTypes && room.rateTypes.length > 0 ? room.rateTypes[0] : null;
                const roomPrice = rt ? rt.avgSellPrice : 0;
                const lineTotal = roomPrice * nights * qty;
                return (
                  <div key={room.roomId} className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs truncate max-w-[180px]">
                      {room.roomName} × {qty}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {formatCurrency(lineTotal, "VND")}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-dashed border-border">
                <span className="font-semibold text-foreground">Tổng cộng</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(grandTotal, "VND")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-right">{nights} đêm</p>
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
            className="w-full rounded-xl border-2 border-border text-foreground font-medium text-sm px-6 py-3 hover:border-primary hover:text-primary transition-colors"
          >
            📞 Gọi tư vấn: 0877.901.901
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          🔒 Miễn phí hủy &bull; Thanh toán an toàn
        </p>
      </div>
    </div>
  );
}