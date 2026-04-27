"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * ActivityFilters — sidebar filter cho trang danh sách hoạt động.
 */
export default function ActivityFilters({ locations = [], categories = [], className }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") || "");
  const [mobileOpen, setMobileOpen] = useState(false);

  const applyFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/activities?${params.toString()}`);
  };

  const clearAll = () => {
    router.push("/activities");
  };

  const hasFilters = searchParams.toString().length > 0;

  const filterContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Bộ lọc</h3>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Loại hình</h4>
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                const val = categoryId === cat.id ? "" : cat.id;
                setCategoryId(val);
                applyFilter("categoryId", val);
              }}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left",
                categoryId === cat.id
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {cat.name}
            </button>
          ))}
          {categories.length === 0 && (
             <div className="text-xs text-gray-400 italic">Đang tải danh mục...</div>
          )}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Khoảng giá</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Từ"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => applyFilter("minPrice", minPrice)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="Đến"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => applyFilter("maxPrice", maxPrice)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Locations */}
      {locations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Điểm đến</h4>
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => applyFilter("locationId", searchParams.get("locationId") === loc.id ? "" : loc.id)}
                className={cn(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left",
                  searchParams.get("locationId") === loc.id
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
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
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Lọc hoạt động
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-80 bg-white p-6 shadow-xl animate-slide-in-left">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">Bộ lọc</h3>
              <button onClick={() => setMobileOpen(false)}>
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}

      <div className={cn("hidden lg:block w-64 flex-shrink-0", className)}>
        <div className="sticky top-24 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          {filterContent}
        </div>
      </div>
    </>
  );
}
