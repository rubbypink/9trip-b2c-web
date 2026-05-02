"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/cart";

/**
 * ActivityBookingWidget — Booking form for activity detail page.
 * Supports date selection, package/zone type, adult/child quantity, real-time total.
 *
 * @param {{
 *   pricingTiers: Array<{
 *     id: string,
 *     name: string,
 *     zone?: string,
 *     description?: string,
 *     adultPrice: number,
 *     childPrice?: number,
 *     childHeightMin?: number,
 *     childHeightMax?: number,
 *     childPolicy?: string,
 *     currency?: string,
 *     capacity?: number,
 *     included?: string[],
 *     isActive: boolean,
 *     sortOrder: number
 *   }>,
 *   activityTitle: string,
 *   activityId: string,
 *   featuredImage?: string,
 *   basePrice?: number,
 *   currency?: string
 * }} props
 */
export default function ActivityBookingWidget({
  pricingTiers = [],
  activityTitle,
  activityId,
  featuredImage = "",
  basePrice = 0,
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

  // Group pricing tiers by zone
  const zones = useMemo(() => {
    const zoneMap = {};
    for (const tier of pricingTiers) {
      const zone = tier.zone || "default";
      if (!zoneMap[zone]) zoneMap[zone] = [];
      zoneMap[zone].push(tier);
    }
    return zoneMap;
  }, [pricingTiers]);

  const selectedTier = useMemo(
    () => pricingTiers.find((t) => t.id === selectedTierId) || pricingTiers[0] || null,
    [pricingTiers, selectedTierId]
  );

  // Calculate total
  const total = useMemo(() => {
    if (!selectedTier) return basePrice * adults;
    const adultTotal = selectedTier.adultPrice * adults;
    const childTotal = (selectedTier.childPrice || 0) * children;
    return adultTotal + childTotal;
  }, [selectedTier, adults, children, basePrice]);

  const tierCurrency = selectedTier?.currency || currency;

  const handleDateChange = useCallback((e) => {
    setSelectedDate(e.target.value);
  }, []);

  const handleAdultsChange = useCallback((delta) => {
    setAdults((prev) => Math.max(1, Math.min(99, prev + delta)));
  }, []);

  const handleChildrenChange = useCallback((delta) => {
    setChildren((prev) => Math.max(0, Math.min(99, prev + delta)));
  }, []);

  const handleBookNow = useCallback(() => {
    if (!selectedDate || adults + children === 0) return;

    const adultTotal = (selectedTier?.adultPrice || basePrice) * adults;
    const childTotal = (selectedTier?.childPrice || 0) * children;
    const totalAmount = adultTotal + childTotal;

    const cartItem = {
      serviceId: activityId,
      serviceType: "activity",
      serviceTitle: activityTitle,
      featuredImage: featuredImage,
      startDate: selectedDate,
      adults: adults,
      children: children,
      infants: 0,
      basePrice: selectedTier?.adultPrice || basePrice,
      total: totalAmount,
      currency: tierCurrency,
      rateType: selectedTier?.name || "Vé tiêu chuẩn"
    };

    addItem(cartItem);
    router.push(`/checkout`);
  }, [router, addItem, activityId, activityTitle, featuredImage, selectedDate, selectedTier, adults, children, basePrice, tierCurrency]);

  const handleConsult = useCallback(() => {
    const phone = "0877.901.901";
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
        {selectedTier?.capacity && (
          <p className="text-xs text-gray-400 mt-1">
            Capacity: {selectedTier.capacity.toLocaleString()} people
          </p>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Date Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Chọn ngày sử dụng vé
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={minDate}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* Pricing Tiers — grouped by zone */}
        {pricingTiers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Loại gói dịch vụ
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(zones).map(([zone, tiers]) => (
                <div key={zone}>
                  {zone !== "default" && (
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                      {zone}
                    </h4>
                  )}
                  <div className="space-y-1">
                    {tiers.map((tier) => (
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
                            {formatCurrency(tier.adultPrice, tier.currency || currency)}
                          </span>
                        </div>
                        {tier.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{tier.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selectors */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                disabled={adults >= 99}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Tăng số người lớn"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {selectedTier && (
                <span className="text-sm text-gray-500 ml-auto">
                  {formatCurrency(selectedTier.adultPrice, tierCurrency)}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Trẻ em
              {selectedTier?.childHeightMin && selectedTier?.childHeightMax && (
                <span className="text-xs text-gray-400 font-normal ml-1">
                  ({selectedTier.childHeightMin}cm - {selectedTier.childHeightMax}cm)
                </span>
              )}
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
                disabled={children >= 99}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Tăng số trẻ em"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {selectedTier && (
                <span className="text-sm text-gray-500 ml-auto">
                  {formatCurrency(selectedTier.childPrice || 0, tierCurrency)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-xl p-4 -mx-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Tổng cộng</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(total, tierCurrency)}
            </span>
          </div>
          {adults + children === 0 && (
            <p className="text-xs text-red-500 mt-1">Vui lòng chọn ít nhất 1 khách</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleBookNow}
            disabled={!selectedDate || adults + children === 0}
            className="w-full rounded-lg bg-blue-600 text-white font-semibold px-6 py-3 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Thanh toán ngay
          </button>
          <button
            onClick={handleConsult}
            className="w-full rounded-lg border-2 border-blue-600 text-blue-600 font-semibold px-6 py-3 hover:bg-blue-50 transition-colors"
          >
            Tư vấn
          </button>
        </div>

        <p className="text-xs text-center text-gray-400">
          Thanh toán an toàn, xác nhận tức thì
        </p>
      </div>
    </div>
  );
}
