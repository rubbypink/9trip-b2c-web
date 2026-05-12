"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@9trip/shared/utils";

/**
 * HotelFilters — sidebar filter cho trang danh sách khách sạn.
 * Các filter: hạng sao, giá, tiện nghi, khu vực, sắp xếp.
 * @param {{ locations?: Array<{id: string, name: string}>, className?: string }} props
 */
export default function HotelFilters({ locations = [], className }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [starRating, setStarRating] = useState(searchParams.get("starRating") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");
  const [selectedAmenities, setSelectedAmenities] = useState(
    searchParams.get("amenities") ? searchParams.get("amenities").split(",") : []
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const AMENITIES_LIST = [
    "Wifi miễn phí", "Hồ bơi", "Spa", "Bãi biển riêng",
    "Phòng gym", "Nhà hàng", "Bar", "Đưa đón sân bay",
    "Điều hòa", "Bồn tắm", "Ban công", "View biển",
  ];

  const SORT_OPTIONS = [
    { value: "newest", label: "Mới nhất" },
    { value: "price_asc", label: "Giá thấp → cao" },
    { value: "price_desc", label: "Giá cao → thấp" },
    { value: "rating", label: "Đánh giá cao nhất" },
  ];

  const applyFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/hotels?${params.toString()}`);
  };

  const clearAll = () => {
    router.push("/hotels");
  };

  const hasFilters = searchParams.toString().length > 0;

  const filterContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Bộ lọc</h3>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Star Rating */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Hạng sao</h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => {
                const val = starRating === String(star) ? "" : String(star);
                setStarRating(val);
                applyFilter("starRating", val);
              }}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors",
                starRating === String(star)
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-muted-foreground hover:bg-surface-2"
              )}
            >
              <div className="flex text-yellow-400">
                {Array.from({ length: star }).map((_, i) => (
                  <svg key={i} className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span>{star} sao</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Sắp xếp</h4>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            applyFilter("sortBy", e.target.value);
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-blue-500 cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Khoảng giá (đêm)</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Từ"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => applyFilter("minPrice", minPrice)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="number"
            placeholder="Đến"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => applyFilter("maxPrice", maxPrice)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Tiện nghi</h4>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-2">
          {AMENITIES_LIST.map((amenity) => (
            <label
              key={amenity}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                selectedAmenities.includes(amenity)
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-muted-foreground hover:bg-surface-2"
              )}
            >
              <input
                type="checkbox"
                checked={selectedAmenities.includes(amenity)}
                onChange={() => {
                  const updated = selectedAmenities.includes(amenity)
                    ? selectedAmenities.filter((a) => a !== amenity)
                    : [...selectedAmenities, amenity];
                  setSelectedAmenities(updated);
                  applyFilter("amenities", updated.length > 0 ? updated.join(",") : "");
                }}
                className="sr-only"
              />
              <svg className={cn("h-4 w-4 flex-shrink-0", selectedAmenities.includes(amenity) ? "text-blue-600" : "text-muted-foreground")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {amenity}
            </label>
          ))}
        </div>
      </div>

      {/* Locations */}
      {locations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Khu vực</h4>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => applyFilter("locationId", searchParams.get("locationId") === loc.id ? "" : loc.id)}
                className={cn(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left",
                  searchParams.get("locationId") === loc.id
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-muted-foreground hover:bg-surface-2"
                )}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-1 mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Lọc khách sạn
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-80 bg-card p-6 shadow-xl animate-slide-in-left">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Bộ lọc</h3>
              <button onClick={() => setMobileOpen(false)}>
                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className={cn("hidden lg:block w-64 flex-shrink-0", className)}>
        <div className="sticky top-24 bg-card rounded-xl border border-border p-5 shadow-sm">
          {filterContent}
        </div>
      </div>
    </>
  );
}
