"use client";

import { useState, useCallback, useMemo } from "react";
import GuestSelector from "@/components/shared/GuestSelector";
import { formatCurrency } from "@/lib/utils";
import { getRealAvailability } from "@/lib/firestore";

/**
 * BookingSidebar — sidebar đặt tour với date picker, guest selector, real-time price.
 * @param {{
 *   tour: object,
 *   onBookNow: (data: object) => void,
 * }} props
 */
export default function BookingSidebar({ tour, onBookNow }) {
  const { pricing = {}, availability = {}, minPeople = 1, maxPeople = 99, title } = tour;

  const [startDate, setStartDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [checking, setChecking] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState(null);

  const adultPrice = pricing?.adultPrice || 0;
  const childPrice = pricing?.childPrice || 0;
  const infantPrice = pricing?.infantPrice || 0;
  const currency = pricing?.currency || "VND";
  const discountPct = pricing?.discountPercent || 0;

  const startDates = availability?.startDates || [];

  // Tính giá real-time
  const priceBreakdown = useMemo(() => {
    const base = adults * adultPrice + children * childPrice + infants * infantPrice;
    const discount = discountPct > 0 ? Math.round((base * discountPct) / 100) : pricing?.discount || 0;
    const total = base - discount;
    return { base, discount, total };
  }, [adults, children, infants, adultPrice, childPrice, infantPrice, discountPct, pricing?.discount]);

  const handleCheckAvailability = useCallback(async () => {
    if (!startDate) return;
    setChecking(true);
    try {
      const totalGuests = adults + children + infants;
      const totalCapacity = tour.maxPeople || tour.availability?.totalSlots || 99;
      const remaining = await getRealAvailability(
        tour.id,
        "tour",
        new Date(startDate),
        totalCapacity
      );
      setAvailabilityResult({
        available: remaining >= totalGuests,
        remaining,
      });
    } catch {
      setAvailabilityResult({ available: false, remaining: 0, error: true });
    } finally {
      setChecking(false);
    }
  }, [startDate, adults, children, infants, tour.id, tour.maxPeople, tour.availability?.totalSlots]);

  const handleBookNow = useCallback(() => {
    if (!startDate) return;
    onBookNow?.({
      serviceId: tour.id,
      serviceType: "tour",
      serviceTitle: tour.title,
      featuredImage: tour.featuredImage,
      startDate,
      adults,
      children,
      infants,
      pricing: priceBreakdown,
      currency,
    });
  }, [startDate, adults, children, infants, priceBreakdown, currency, tour, onBookNow]);

  const totalGuests = adults + children + infants;

  return (
    <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Price Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Giá từ</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(adultPrice, currency)}
          </span>
          <span className="text-sm text-gray-500">/ người</span>
        </div>
        {discountPct > 0 && (
          <span className="inline-block mt-1 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
            Giảm {discountPct}%
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Date Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Ngày khởi hành
          </label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setAvailabilityResult(null);
              }}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>
          {startDates.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {startDates.length} ngày khởi hành có sẵn
            </div>
          )}
        </div>

        {/* Guest Selector */}
        <GuestSelector
          adults={adults}
          children={children}
          infants={infants}
          onAdultsChange={(v) => {
            setAdults(v);
            setAvailabilityResult(null);
          }}
          onChildrenChange={(v) => {
            setChildren(v);
            setAvailabilityResult(null);
          }}
          onInfantsChange={(v) => {
            setInfants(v);
            setAvailabilityResult(null);
          }}
          minAdults={minPeople || 1}
          maxAdults={maxPeople || 99}
          showInfants
        />

        {/* Availability Result */}
        {availabilityResult && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              availabilityResult.available
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {availabilityResult.available
              ? `Còn ${availabilityResult.remaining} chỗ trống`
              : "Hết chỗ cho ngày này"}
          </div>
        )}

        {/* Price Breakdown */}
        <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>
              {adults} NL &times; {formatCurrency(adultPrice, currency)}
            </span>
            <span>{formatCurrency(adults * adultPrice, currency)}</span>
          </div>
          {children > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>
                {children} TE &times; {formatCurrency(childPrice, currency)}
              </span>
              <span>{formatCurrency(children * childPrice, currency)}</span>
            </div>
          )}
          {infants > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>
                {infants} EB &times; {formatCurrency(infantPrice, currency)}
              </span>
              <span>{formatCurrency(infants * infantPrice, currency)}</span>
            </div>
          )}
          {priceBreakdown.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Giảm giá</span>
              <span>-{formatCurrency(priceBreakdown.discount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-100">
            <span>Tổng cộng</span>
            <span className="text-primary">{formatCurrency(priceBreakdown.total, currency)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleCheckAvailability}
            disabled={!startDate || checking}
            className="w-full rounded-lg bg-primary/10 text-primary font-semibold py-3 text-sm hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? "Đang kiểm tra..." : "Kiểm tra chỗ trống"}
          </button>
          <button
            onClick={handleBookNow}
            disabled={!startDate || totalGuests === 0}
            className="w-full rounded-lg bg-primary text-white font-semibold py-3 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Đặt ngay
          </button>
        </div>

        {/* Contact Info */}
        <div className="text-center text-xs text-gray-400 pt-1">
          Cần hỗ trợ? Gọi <span className="font-medium text-gray-600">1900 9999</span>
        </div>
      </div>
    </div>
  );
}