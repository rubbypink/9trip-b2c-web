"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/cart";

/**
 * HotelBookingWidget — Booking form cho trang chi tiết khách sạn.
 * Tương tự TourBookingWidget pattern, thiết kế cho hotel.
 *
 * Features:
 * - Date picker: Check-in / Check-out (2 input date)
 * - Guest selector: Người lớn (1-20), Trẻ em (0-10)
 * - Room selector: Chọn loại phòng (nếu có nhiều loại)
 * - Price breakdown: Tổng = giá × số đêm × số phòng
 * - Promo code input
 * - "Đặt ngay" CTA + "Gọi tư vấn" CTA
 * - Real-time total calculation
 * - Responsive: sticky desktop sidebar, collapsible mobile bottom bar
 *
 * @param {{
 *   hotelId: string,
 *   hotelName: string,
 *   rooms: Array<{
 *     id: string,
 *     name: string,
 *     price: number,
 *     promoPrice?: number,
 *     promoLabel?: string,
 *     currency?: string,
 *     maxAdults?: number,
 *     maxChildren?: number,
 *     pricingTiers?: Array<{
 *       id: string,
 *       name: string,
 *       adultPrice: number,
 *       childPrice?: number,
 *       promoPrice?: number,
 *       promoLabel?: string,
 *       included?: string[],
 *       currency?: string,
 *     }>,
 *   }>,
 *   basePrice?: number,
 *   currency?: string,
 * }} props
 */
export default function HotelBookingWidget({
  hotelId,
  hotelName,
  rooms = [],
  basePrice = 0,
  currency = "VND",
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(
    rooms.length > 0 ? rooms[0].id : null
  );
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [promoCode, setPromoCode] = useState("");

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || rooms[0] || null,
    [rooms, selectedRoomId]
  );

  // Tính số đêm từ check-in/check-out
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    return Math.max(1, Math.round((co - ci) / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  // Room price: ưu tiên promoPrice, fallback price
  const roomPrice = useMemo(() => {
    if (!selectedRoom) return basePrice;
    return selectedRoom.promoPrice || selectedRoom.price || basePrice;
  }, [selectedRoom, basePrice]);

  // Tính tổng
  const total = useMemo(() => {
    return roomPrice * nights;
  }, [roomPrice, nights]);

  // Min date: today
  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Handle check-in change (auto-set check-out nếu chưa có hoặc < check-in)
  const handleCheckInChange = useCallback(
    (e) => {
      const val = e.target.value;
      setCheckIn(val);
      if (!checkOut || val >= checkOut) {
        const ci = new Date(val);
        ci.setDate(ci.getDate() + 1);
        setCheckOut(ci.toISOString().split("T")[0]);
      }
    },
    [checkOut]
  );

  const handleAdultsChange = useCallback((delta) => {
    setAdults((prev) => Math.max(1, Math.min(20, prev + delta)));
  }, []);

  const handleChildrenChange = useCallback((delta) => {
    setChildren((prev) => Math.max(0, Math.min(10, prev + delta)));
  }, []);

  const handleBookNow = useCallback(() => {
    // Add to cart first
    if (selectedRoom) {
      addItem({
        serviceId: hotelId,
        serviceType: "hotel_room",
        serviceTitle: `${hotelName} - ${selectedRoom.name}`,
        featuredImage: selectedRoom.featuredImage || "",
        startDate: checkIn || new Date().toISOString(),
        endDate: checkOut || "",
        adults,
        children,
        infants: 0,
        rooms: 1,
        basePrice: roomPrice,
        discount: selectedRoom.promoPrice ? (selectedRoom.price - selectedRoom.promoPrice) : 0,
        total: total,
        currency,
      });
    }
    router.push("/checkout");
  }, [router, hotelId, hotelName, selectedRoom, checkIn, checkOut, adults, children, roomPrice, total, currency, addItem]);

  const handleConsult = useCallback(() => {
    const phone = "0886.068.886";
    window.open(`tel:${phone.replace(/[^0-9]/g, "")}`, "_self");
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Price Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Giá từ</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {roomPrice > 0 ? formatCurrency(roomPrice, currency) : "Liên hệ"}
          </span>
          <span className="text-sm text-gray-500">/ đêm</span>
        </div>
        {selectedRoom?.promoLabel && (
          <span className="inline-block mt-1.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            🏷️ {selectedRoom.promoLabel}
          </span>
        )}
        {selectedRoom?.pricingTiers?.length > 0 && selectedRoom.pricingTiers[0]?.promoLabel && (
          <span className="inline-block mt-1.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            🏷️ {selectedRoom.pricingTiers[0].promoLabel}
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Check-in / Check-out */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Nhận phòng
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={handleCheckInChange}
              min={minDate}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Trả phòng
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || minDate}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Room Selector */}
        {rooms.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Loại phòng
            </label>
            <div className="space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-sm border transition-all ${
                    selectedRoomId === room.id
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{room.name}</span>
                    <span className="font-semibold text-blue-600">
                      {room.promoPrice
                        ? formatCurrency(room.promoPrice, room.currency || currency)
                        : room.price > 0
                          ? formatCurrency(room.price, room.currency || currency)
                          : "Liên hệ"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {room.maxAdults > 0 && (
                      <span className="text-xs text-gray-400">
                        👤 {room.maxAdults} người
                      </span>
                    )}
                    {room.bedType && (
                      <span className="text-xs text-gray-400">
                        🛏️ {room.bedType}
                      </span>
                    )}
                    {room.roomSize && (
                      <span className="text-xs text-gray-400">
                        📐 {room.roomSize}m²
                      </span>
                    )}
                  </div>
                  {room.promoLabel && (
                    <span className="mt-1 inline-block text-xs font-medium text-red-600">
                      🏷️ {room.promoLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Guest Selectors */}
        <div className="space-y-3">
          {/* Adults */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Người lớn
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAdultsChange(-1)}
                disabled={adults <= 1}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Giảm số người lớn"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-10 text-center font-semibold text-gray-900 text-lg tabular-nums">
                {String(adults).padStart(2, "0")}
              </span>
              <button
                onClick={() => handleAdultsChange(1)}
                disabled={adults >= 20}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Tăng số người lớn"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Children */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Trẻ em
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleChildrenChange(-1)}
                disabled={children <= 0}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Giảm số trẻ em"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-10 text-center font-semibold text-gray-900 text-lg tabular-nums">
                {String(children).padStart(2, "0")}
              </span>
              <button
                onClick={() => handleChildrenChange(1)}
                disabled={children >= 10}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Tăng số trẻ em"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Mã giảm giá
          </label>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Nhập mã ưu đãi (nếu có)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* Total */}
        <div className="border-t border-gray-100 pt-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-gray-500">
              <span>
                {formatCurrency(roomPrice, currency)} x {nights} đêm
              </span>
              <span>{formatCurrency(roomPrice * nights, currency)}</span>
            </div>
            {roomPrice > 0 && selectedRoom?.price > roomPrice && (
              <div className="flex items-center justify-between text-green-600">
                <span>Tiết kiệm</span>
                <span>-{formatCurrency((selectedRoom.price - roomPrice) * nights, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
              <span className="font-semibold text-gray-900">Tổng cộng</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(total, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={handleBookNow}
            className="w-full rounded-xl bg-primary text-white font-semibold text-sm px-6 py-3.5 hover:bg-primary-dark transition-colors shadow-sm hover:shadow-md"
          >
            Đặt ngay
          </button>
          <button
            onClick={handleConsult}
            className="w-full rounded-xl border-2 border-gray-200 text-gray-700 font-medium text-sm px-6 py-3 hover:border-primary hover:text-primary transition-colors"
          >
            📞 Gọi tư vấn: 0886.068.886
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          🔒 Miễn phí hủy &bull; Thanh toán an toàn
        </p>
      </div>
    </div>
  );
}
