"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * SearchFormPopup — Quick search popup trên listing page.
 * Cho phép người dùng thay đổi nhanh bộ lọc mà không cần scroll lên sidebar.
 *
 * @param {Object} props
 * @param {string} props.type - Loại service (tour, hotel, activity)
 * @param {Array} props.locations - Danh sách locations để chọn
 * @param {Object} props.currentFilters - Bộ lọc hiện tại từ URL params
 */
export default function SearchFormPopup({ type = "tour", locations = [], currentFilters = {} }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef(null);

  // State cho form local
  const [locationId, setLocationId] = useState(currentFilters.locationId || "");
  const [tourTypeId, setTourTypeId] = useState(currentFilters.tourTypeId || "");
  const [sortBy, setSortBy] = useState(currentFilters.sortBy || "newest");

  // Close khi click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close với Escape key
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (locationId) params.set("locationId", locationId);
    if (tourTypeId) params.set("tourTypeId", tourTypeId);
    if (sortBy && sortBy !== "newest") params.set("sortBy", sortBy);
    router.push(`/${type}s?${params.toString()}`);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocationId("");
    setTourTypeId("");
    setSortBy("newest");
    router.push(`/${type}s`);
    setIsOpen(false);
  };

  const tourTypes = [
    { id: "type-cultural", label: "Văn hóa - Lịch sử" },
    { id: "type-beach", label: "Biển - Nghỉ dưỡng" },
    { id: "type-adventure", label: "Mạo hiểm" },
    { id: "type-eco", label: "Sinh thái" },
    { id: "type-food", label: "Ẩm thực" },
  ];

  return (
    <div className="relative" ref={popupRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-foreground text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Tìm nhanh
        {(locationId || tourTypeId) && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-500 text-white rounded-full">
            {[locationId, tourTypeId].filter(Boolean).length}
          </span>
        )}
      </button>

      {/* Popup Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-card rounded-xl shadow-xl border border-border z-50 p-4">
          <form onSubmit={handleSubmit}>
            {/* Location Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Điểm đến
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Tất cả điểm đến</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tour Type Select */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Loại tour
              </label>
              <select
                value={tourTypeId}
                onChange={(e) => setTourTypeId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Tất cả loại tour</option>
                {tourTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Sắp xếp
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
                <option value="rating">Đánh giá cao nhất</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-surface-1 transition-colors"
              >
                Xóa bộ lọc
              </button>
              <button
                type="submit"
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Áp dụng
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}