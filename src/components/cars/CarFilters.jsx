"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * CarFilters — sidebar filter cho trang danh sách thuê xe.
 */
export default function CarFilters({ className }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [carType, setCarType] = useState(searchParams.get("carType") || "");
  const [transmission, setTransmission] = useState(searchParams.get("transmission") || "");
  const [mobileOpen, setMobileOpen] = useState(false);

  const applyFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/cars?${params.toString()}`);
  };

  const clearAll = () => {
    router.push("/cars");
  };

  const hasFilters = searchParams.toString().length > 0;

  const carTypes = ["Sedan", "SUV", "Hatchback", "MPV", "Luxury", "Bán tải"];

  const filterContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Bộ lọc</h3>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">
            Xóa tất cả
          </button>
        )}
      </div>

      {/* Car Type */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Loại xe</h4>
        <div className="grid grid-cols-2 gap-2">
          {carTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                const val = carType === type ? "" : type;
                setCarType(val);
                applyFilter("carType", val);
              }}
              className={cn(
                "px-3 py-2 text-xs rounded-lg border transition-all text-center",
                carType === type
                  ? "bg-blue-600 border-blue-600 text-white shadow-md"
                  : "bg-card border-border text-muted-foreground hover:border-blue-400"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Hộp số</h4>
        <div className="space-y-2">
          {["automatic", "manual"].map((trans) => (
            <label key={trans} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="transmission"
                checked={transmission === trans}
                onChange={() => {
                  setTransmission(trans);
                  applyFilter("transmission", trans);
                }}
                className="w-4 h-4 text-blue-600 border-border focus:ring-blue-500"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground capitalize">
                {trans === "automatic" ? "Tự động" : "Số sàn"}
              </span>
            </label>
          ))}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="radio"
              name="transmission"
              checked={transmission === ""}
              onChange={() => {
                setTransmission("");
                applyFilter("transmission", "");
              }}
              className="w-4 h-4 text-blue-600 border-border focus:ring-blue-500"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground">Tất cả</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted mb-4"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Lọc xe
      </button>

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

      <div className={cn("hidden lg:block w-64 flex-shrink-0", className)}>
        <div className="sticky top-24 bg-card rounded-xl border border-border p-5 shadow-sm">
          {filterContent}
        </div>
      </div>
    </>
  );
}
