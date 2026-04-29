"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/cart";

/**
 * TourBookingWidget — Booking form for tour detail page.
 * Supports date selection, package type (ghép/riêng), adult/child/infant qty, real-time total.
 *
 * @param {{
 *   pricingTiers: Array<{
 *     id: string,
 *     name: string,
 *     description?: string,
 *     adultPrice: number,
 *     childPrice?: number,
 *     infantPrice?: number,
 *     currency?: string,
 *     minPeople?: number,
 *     maxPeople?: number,
 *     included?: string[],
 *     isActive: boolean,
 *     sortOrder: number
 *   }>,
 *   tourTitle: string,
 *   tourId: string,
 *   basePrice?: number,
 *   baseChildPrice?: number,
 *   baseInfantPrice?: number,
 *   currency?: string
 * }} props
 */
export default function TourBookingWidget({
  pricingTiers = [],
  tourTitle,
  tourId,
  basePrice = 0,
  baseChildPrice = 0,
  baseInfantPrice = 0,
  currency = "VND",
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTierId, setSelectedTierId] = useState(
    pricingTiers.length > 0 ? pricingTiers[0].id : null
  );
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const selectedTier = useMemo(
    () => pricingTiers.find((t) => t.id === selectedTierId) || pricingTiers[0] || null,
    [pricingTiers, selectedTierId]
  );

  const tierAdultPrice = selectedTier?.adultPrice || basePrice;
  const tierChildPrice = selectedTier?.childPrice ?? baseChildPrice;
  const tierInfantPrice = selectedTier?.infantPrice ?? baseInfantPrice;
  const tierCurrency = selectedTier?.currency || currency;

  // Calculate total
  const total = useMemo(() => {
    return adults * tierAdultPrice + children * tierChildPrice + infants * tierInfantPrice;
  }, [tierAdultPrice, tierChildPrice, tierInfantPrice, adults, children, infants]);

  const handleDateChange = useCallback((e) => {
    setSelectedDate(e.target.value);
  }, []);

  const handleAdultsChange = useCallback((delta) => {
    setAdults((prev) => Math.max(1, Math.min(99, prev + delta)));
  }, []);

  const handleChildrenChange = useCallback((delta) => {
    setChildren((prev) => Math.max(0, Math.min(99, prev + delta)));
  }, []);

  const handleInfantsChange = useCallback((delta) => {
    setInfants((prev) => Math.max(0, Math.min(99, prev + delta)));
  }, []);

  const handleBookNow = useCallback(() => {
    try {
      // Add to cart first
      addItem({
        serviceId: tourId,
        serviceType: "tour",
        serviceTitle: tourTitle,
        featuredImage: "",
        startDate: selectedDate || new Date().toISOString(),
        endDate: "",
        adults,
        children,
        infants,
        rooms: 1,
        basePrice: selectedTier?.adultPrice || basePrice,
        discount: 0,
        total: total,
        currency: selectedTier?.currency || currency,
      });
      router.push("/checkout");
    } catch (error) {
      console.error('[TourBookingWidget] Error booking:', error.message);
    }
  }, [router, tourId, tourTitle, selectedDate, selectedTierId, selectedTier, adults, children, infants, total, basePrice, currency, addItem]);

  const handleConsult = useCallback(() => {
    const phone = "0886.068.886";
    window.open(`tel:${phone.replace(/[^0-9]/g, "")}`, "_self");
  }, []);

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header — Price */}
      <div className="p-5 border-b border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Giá từ</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {selectedTier
              ? formatCurrency(selectedTier.adultPrice, tierCurrency)
              : basePrice > 0
                ? formatCurrency(basePrice, currency)
                : "Liên hệ"}
          </span>
          <span className="text-sm text-gray-500">/ người</span>
        </div>
        {selectedTier?.included?.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">Bao gồm: {selectedTier.included.slice(0, 2).join(", ")}</p>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Date Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Chọn ngày khởi hành
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={minDate}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* Pricing Tiers */}
        {pricingTiers.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Loại gói dịch vụ
            </label>
            <div className="space-y-1">
              {pricingTiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-sm border transition-all ${
                    selectedTierId === tier.id
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{tier.name}</span>
                    <span className="font-semibold text-blue-600">
                      {tier.adultPrice > 0 ? formatCurrency(tier.adultPrice, tier.currency || currency) : "Liên hệ"}
                    </span>
                  </div>
                  {tier.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{tier.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selectors */}
        <div className="space-y-3">
          {/* Adults */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Người lớn</label>
            <div className="flex items-center gap-3">
              <button onClick={() => handleAdultsChange(-1)} disabled={adults <= 1}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Giảm số người lớn">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
              <span className="w-10 text-center font-semibold text-gray-900 text-lg tabular-nums">{String(adults).padStart(2, "0")}</span>
              <button onClick={() => handleAdultsChange(1)} disabled={adults >= 99}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Tăng số người lớn">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <span className="text-sm text-gray-500 ml-auto">{formatCurrency(tierAdultPrice, tierCurrency)}</span>
            </div>
          </div>

          {/* Children */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trẻ em</label>
            <div className="flex items-center gap-3">
              <button onClick={() => handleChildrenChange(-1)} disabled={children <= 0}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Giảm số trẻ em">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
              <span className="w-10 text-center font-semibold text-gray-900 text-lg tabular-nums">{String(children).padStart(2, "0")}</span>
              <button onClick={() => handleChildrenChange(1)} disabled={children >= 99}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Tăng số trẻ em">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <span className="text-sm text-gray-500 ml-auto">{formatCurrency(tierChildPrice, tierCurrency)}</span>
            </div>
          </div>

          {/* Infants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Em bé</label>
            <div className="flex items-center gap-3">
              <button onClick={() => handleInfantsChange(-1)} disabled={infants <= 0}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Giảm số em bé">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
              </button>
              <span className="w-10 text-center font-semibold text-gray-900 text-lg tabular-nums">{String(infants).padStart(2, "0")}</span>
              <button onClick={() => handleInfantsChange(1)} disabled={infants >= 99}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Tăng số em bé">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <span className="text-sm text-gray-500 ml-auto">{formatCurrency(tierInfantPrice, tierCurrency)}</span>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-xl p-4 -mx-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Tổng cộng</span>
            <span className="text-xl font-bold text-gray-900">{formatCurrency(total, tierCurrency)}</span>
          </div>
          {adults + children + infants === 0 && (
            <p className="text-xs text-red-500 mt-1">Vui lòng chọn ít nhất 1 khách</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleBookNow}
            disabled={!selectedDate || adults + children + infants === 0}
            className="w-full rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Đặt ngay
          </button>
          <button
            onClick={handleConsult}
            className="w-full rounded-lg border-2 border-blue-600 text-blue-600 font-semibold px-6 py-3 hover:bg-blue-50 transition-colors"
          >
            Tư vấn
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">Thanh toán an toàn, xác nhận tức thì</p>
      </div>
    </div>
  );
}
