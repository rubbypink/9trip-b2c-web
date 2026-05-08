"use client";

import { useState } from "react";
import HotelSearchForm from "./HotelSearchForm";

import { useRouter } from "next/navigation";

/**
 * SearchTabsClient — Tab điều hướng giữa các loại tìm kiếm: Tour, Khách sạn, Hoạt động.
 * Sử dụng 'use client' để xử lý state tab active.
 * @param {{ locations?: Array<{id: string, name: string}> }} props
 */
export default function SearchTabsClient({ locations }) {
  const [activeTab, setActiveTab] = useState("tour");

  const tabs = [
    { key: "tour", label: "Tour", icon: "🌍" },
    { key: "hotel", label: "Khách sạn", icon: "🏨" },
    { key: "activities", label: "Hoạt động", icon: "🎯" },
  ];

  return (
    <div className="p-4 sm:p-5">
      {/* Tab Headers */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl mb-5" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white text-primary-700 shadow-sm ring-1 ring-primary-200/50"
                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search Form theo tab — truyền locations xuống */}
      {activeTab === "tour" && <TourSearchForm locations={locations} />}
      {activeTab === "hotel" && <HotelSearchForm locations={locations} />}
      {activeTab === "activities" && <ActivitySearchForm locations={locations} />}
    </div>
  );
}

/**
 * TourSearchForm — Form tìm kiếm tour với điểm đến, ngày đi, giá.
 * Nhận `locations` prop, fallback về hardcode nếu không có.
 * @param {{ locations?: Array<{id: string, name: string}> }} props
 */
function TourSearchForm({ locations }) {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [priceRange, setPriceRange] = useState("");

  const destinationList = locations && locations.length > 0
    ? [{ value: "", label: "Chọn điểm đến" }, ...locations.map((loc) => ({ value: loc.id, label: loc.name }))]
    : [
        { value: "", label: "Chọn điểm đến" },
        { value: "ha-long", label: "Hạ Long" },
        { value: "da-nang", label: "Đà Nẵng" },
        { value: "hoi-an", label: "Hội An" },
        { value: "nha-trang", label: "Nha Trang" },
        { value: "phu-quoc", label: "Phú Quốc" },
        { value: "da-lat", label: "Đà Lạt" },
        { value: "sapa", label: "Sapa" },
      ];

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.append("locationId", location);
    if (date) params.append("date", date);
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      if (min) params.append("minPrice", min);
      if (max && max !== "999999999") params.append("maxPrice", max);
    }
    
    router.push(`/tours?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Điểm đến */}
        <div className="relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Điểm đến</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <select
              className="w-full pl-9 pr-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {destinationList.map((d) =>
                d.value === "" ? (
                  <option key="" value="" disabled>
                    {d.label}
                  </option>
                ) : (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Ngày đi */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Ngày đi</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Khoảng giá */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Khoảng giá</label>
          <select
            className="w-full px-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
          >
            <option value="">Tất cả mức giá</option>
            <option value="0-3000000">Dưới 3 triệu</option>
            <option value="3000000-7000000">3 - 7 triệu</option>
            <option value="7000000-15000000">7 - 15 triệu</option>
            <option value="15000000-999999999">Trên 15 triệu</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
      >
        🔍 Tìm Tour ngay
      </button>
    </form>
  );
}

/**
 * ActivitySearchForm — Form tìm kiếm hoạt động với điểm đến, thể loại, giá.
 * @param {{ locations?: Array<{id: string, name: string}> }} props
 */
function ActivitySearchForm({ locations }) {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [priceRange, setPriceRange] = useState("");

  const destinationList = locations && locations.length > 0
    ? [{ value: "", label: "Chọn điểm đến" }, ...locations.map((loc) => ({ value: loc.id, label: loc.name }))]
    : [
        { value: "", label: "Chọn điểm đến" },
        { value: "phu-quoc", label: "Phú Quốc" },
        { value: "da-nang", label: "Đà Nẵng" },
        { value: "nha-trang", label: "Nha Trang" },
        { value: "hoi-an", label: "Hội An" },
        { value: "ha-long", label: "Hạ Long" },
        { value: "da-lat", label: "Đà Lạt" },
        { value: "sapa", label: "Sapa" },
      ];

  const categories = [
    { value: "", label: "Tất cả thể loại" },
    { value: "sightseeing", label: "Tham quan" },
    { value: "adventure", label: "Mạo hiểm" },
    { value: "water-sports", label: "Thể thao dưới nước" },
    { value: "eco-tour", label: "Sinh thái" },
    { value: "workshop", label: "Lớp học & Workshop" },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.append("locationId", location);
    if (category) params.append("categoryId", category);
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      if (min) params.append("minPrice", min);
      if (max && max !== "999999999") params.append("maxPrice", max);
    }
    router.push(`/activities?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Điểm đến */}
        <div className="relative">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Điểm đến</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <select
              className="w-full pl-9 pr-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {destinationList.map((d) =>
                d.value === "" ? (
                  <option key="" value="" disabled>
                    {d.label}
                  </option>
                ) : (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Thể loại */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Thể loại</label>
          <select
            className="w-full px-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Khoảng giá */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Khoảng giá</label>
          <select
            className="w-full px-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
          >
            <option value="">Tất cả mức giá</option>
            <option value="0-500000">Dưới 500k</option>
            <option value="500000-2000000">500k - 2 triệu</option>
            <option value="2000000-5000000">2 - 5 triệu</option>
            <option value="5000000-999999999">Trên 5 triệu</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
      >
        🎯 Tìm hoạt động
      </button>
    </form>
  );
}