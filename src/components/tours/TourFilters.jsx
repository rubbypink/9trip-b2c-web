"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@9trip/shared/utils";

/**
 * TourFilters — sidebar filter cho trang danh sách tour.
 * Các filter: giá (range slider), rating, tour type, location.
 * Mỗi thay đổi sẽ update URL searchParams để SSR/ISR fetch dữ liệu.
 */
export default function TourFilters({ locations = [], tourTypes = [], priceRange = { min: 0, max: 50000000 }, className }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [minRating, setMinRating] = useState(searchParams.get("minRating") || "");
  const [locationId, setLocationId] = useState(searchParams.get("locationId") || "");
  const [tourTypeId, setTourTypeId] = useState(searchParams.get("tourTypeId") || "");
  const [mobileOpen, setMobileOpen] = useState(false);

  const applyFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // reset pagination
    router.push(`/tours?${params.toString()}`);
  };

  const clearAll = () => {
    router.push("/tours");
  };

  const hasFilters = searchParams.toString().length > 0;

  const filterContent = (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-base">Bộ lọc</h3>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-primary hover:underline"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">Khoảng giá</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={priceRange.min.toLocaleString()}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => applyFilter("minPrice", minPrice)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <input
            type="number"
            placeholder={priceRange.max.toLocaleString()}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => applyFilter("maxPrice", maxPrice)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Rating Filter */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">Đánh giá</h4>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => {
                const val = minRating === String(star) ? "" : String(star);
                setMinRating(val);
                applyFilter("minRating", val);
              }}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors",
                minRating === String(star)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-surface-2"
              )}
            >
              <span className="flex items-center gap-0.5 text-secondary">
                {Array.from({ length: star }, (_, i) => (
                  <svg key={i} className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </span>
              <span>trở lên</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tour Type Filter */}
      {tourTypes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Loại tour</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {tourTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  const val = tourTypeId === type.id ? "" : type.id;
                  setTourTypeId(val);
                  applyFilter("tourTypeId", val);
                }}
                className={cn(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors",
                  tourTypeId === type.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-surface-2"
                )}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location Filter */}
      {locations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Điểm đến</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => {
                  const val = locationId === loc.id ? "" : loc.id;
                  setLocationId(val);
                  applyFilter("locationId", val);
                }}
                className={cn(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors",
                  locationId === loc.id
                    ? "bg-primary/10 text-primary font-medium"
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
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-1 mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Bộ lọc
        {hasFilters && (
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-xs">
            !
          </span>
        )}
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-80 bg-card p-6 overflow-y-auto lg:hidden shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Bộ lọc</h3>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-muted-foreground">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {filterContent}
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className={cn("hidden lg:block w-auto flex-shrink-0", className)}>
        <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
          {filterContent}
        </div>
      </aside>
    </>
  );
}