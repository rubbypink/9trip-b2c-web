"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/cart";

/**
 * RoomsPanel — Bảng giá phòng với quantity selector, sync cart, confirm button.
 * Hiển thị tất cả room × rate types trong dạng table.
 * User chọn số lượng cho mỗi room/rate type, xem thành tiền real-time.
 *
 * @param {{
 *   pricingTable: Array<{
 *     roomId: string,
 *     roomName: string,
 *     totalRooms: number,
 *     maxGuests: number,
 *     bedType: string,
 *     amenities: string[],
 *     included: string[],
 *     featuredImage: string,
 *     rateTypes: Array<{
 *       rateType: string,
 *       avgSellPrice: number,
 *       dailyPrices: Array<{date: string, sellPrice: number, costPrice: number}>
 *     }>
 *   }>,
 *   hotel: Object,
 *   checkIn: string,
 *   checkOut: string,
 *   nights: number,
 * }} props
 */
export default function RoomsPanel({ pricingTable = [], hotel = {}, checkIn = "", checkOut = "", nights = 1 }) {
  const router = useRouter();
  const { addItem } = useCart();

  // State: quantity cho mỗi room × rateType (key: "roomId_rateType")
  const [quantities, setQuantities] = useState({});

  /**
   * Thay đổi số lượng cho 1 room + rate type.
   * @param {string} roomId
   * @param {string} rateType
   * @param {number} delta
   */
  const updateQuantity = useCallback((roomId, rateType, delta) => {
    const key = `${roomId}_${rateType}`;
    setQuantities((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, Math.min(10, current + delta)); // max 10 phòng
      return { ...prev, [key]: next };
    });
  }, []);

  /**
   * Tổng tiền cho 1 room × rate type.
   */
  const getLineTotal = useCallback((roomId, rateType, sellPrice) => {
    const key = `${roomId}_${rateType}`;
    const qty = quantities[key] || 0;
    return sellPrice * nights * qty;
  }, [quantities, nights]);

  /**
   * Tổng tiền tất cả selections.
   */
  const grandTotal = useMemo(() => {
    let total = 0;
    for (const room of pricingTable) {
      for (const rt of room.rateTypes) {
        total += getLineTotal(room.roomId, rt.rateType, rt.avgSellPrice);
      }
    }
    return total;
  }, [pricingTable, getLineTotal]);

  /**
   * Có ít nhất 1 selection.
   */
  const hasSelection = useMemo(() => {
    return Object.values(quantities).some((q) => q > 0);
  }, [quantities]);

  /**
   * Xác nhận chọn phòng — thêm tất cả selected rooms vào cart.
   */
  const handleConfirmSelection = useCallback(() => {
    try {
      for (const room of pricingTable) {
        for (const rt of room.rateTypes) {
          const key = `${room.roomId}_${rt.rateType}`;
          const qty = quantities[key] || 0;
          if (qty === 0) continue;

          const lineTotal = getLineTotal(room.roomId, rt.rateType, rt.avgSellPrice);

          addItem({
            serviceId: hotel.id,
            roomId: room.roomId,
            serviceType: "hotel_room",
            serviceTitle: `${hotel.name} — ${room.roomName}`,
            featuredImage: room.featuredImage || hotel.featuredImage || "",
            startDate: checkIn || new Date().toISOString(),
            endDate: checkOut || "",
            adults: 2,
            children: 0,
            infants: 0,
            rooms: qty,
            rateType: rt.rateType,
            basePrice: rt.avgSellPrice,
            costPrice: rt.dailyPrices[0]?.costPrice || 0,
            discount: 0,
            total: lineTotal,
            currency: "VND",
            hotelId: hotel.id,
            hotelName: hotel.name,
            roomName: room.roomName,
          });
        }
      }
      router.push("/cart");
    } catch (error) {
      console.error('[RoomsPanel] Error confirming selection:', error.message);
      // Cart add failed — user can retry
    }
  }, [pricingTable, quantities, getLineTotal, addItem, hotel, checkIn, checkOut, router]);

  if (pricingTable.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <svg className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="font-medium text-gray-700">Chưa có thông tin phòng</p>
        <p className="text-sm text-gray-400 mt-1">Khách sạn này chưa cập nhật phòng. Vui lòng quay lại sau.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pricing Table */}
      {pricingTable.map((room) => (
        <div key={room.roomId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Room Header */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              {room.featuredImage && (
                <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 relative">
                  <Image src={room.featuredImage} alt={room.roomName} fill className="object-cover" sizes="80px" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">{room.roomName}</h4>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {room.bedType && (
                    <span className="inline-flex items-center text-xs text-gray-500">
                      🛏️ {room.bedType}
                    </span>
                  )}
                  {room.maxGuests > 0 && (
                    <span className="inline-flex items-center text-xs text-gray-500">
                      👤 Tối đa {room.maxGuests} khách
                    </span>
                  )}
                  <span className="inline-flex items-center text-xs text-gray-500">
                    📦 Còn {room.totalRooms} phòng
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {room.included?.slice(0, 4).map((inc, i) => (
                    <span key={i} className="inline-block text-[11px] bg-green-50 text-green-700 rounded-full px-2 py-0.5">
                      ✓ {inc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rate Type Rows */}
          <div className="divide-y divide-gray-100">
            {room.rateTypes.length > 0 ? (
              room.rateTypes.map((rt) => {
                const key = `${room.roomId}_${rt.rateType}`;
                const qty = quantities[key] || 0;
                const lineTotal = getLineTotal(room.roomId, rt.rateType, rt.avgSellPrice);

                return (
                  <div key={rt.rateType} className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                    {/* Rate Type Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 capitalize">
                        {rt.rateType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {nights} đêm × {Math.round(rt.avgSellPrice).toLocaleString()}đ/đêm
                      </p>
                    </div>

                    {/* Unit Price */}
                    <div className="text-right w-28">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(rt.avgSellPrice, "VND")}
                      </p>
                      <p className="text-xs text-gray-400">/đêm</p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(room.roomId, rt.rateType, -1)}
                        disabled={qty === 0}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm font-semibold text-gray-900">{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(room.roomId, rt.rateType, 1)}
                        disabled={qty >= room.totalRooms}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right w-28">
                      <p className={lineTotal > 0 ? "text-sm font-bold text-primary" : "text-sm text-gray-300"}>
                        {lineTotal > 0 ? formatCurrency(lineTotal, "VND") : "—"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-sm text-gray-400 text-center">
                Chưa có giá cho ngày đã chọn
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Sticky Bottom Bar — Confirm Selection */}
      {hasSelection && (
        <div className="sticky bottom-0 z-30 bg-white border-t border-gray-200 shadow-lg rounded-t-xl p-4 -mx-1">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div>
              <p className="text-xs text-gray-500">Tổng tạm tính</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(grandTotal, "VND")}</p>
              <p className="text-xs text-gray-400">{nights} đêm</p>
            </div>
            <button
              type="button"
              onClick={handleConfirmSelection}
              className="rounded-xl bg-primary text-white font-semibold text-sm px-8 py-3 hover:bg-primary-dark transition-colors shadow-sm"
            >
              Xác nhận chọn phòng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
