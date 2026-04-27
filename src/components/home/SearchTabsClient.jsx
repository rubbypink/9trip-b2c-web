"use client";

import { useState } from "react";
import HotelSearchForm from "./HotelSearchForm";

/**
 * SearchTabsClient — Tab điều hướng giữa các loại tìm kiếm: Tour, Khách sạn, Vé máy bay.
 * Sử dụng 'use client' để xử lý state tab active.
 */
export default function SearchTabsClient() {
  const [activeTab, setActiveTab] = useState("tour");

  const tabs = [
    { key: "tour", label: "Tour", icon: "🌍" },
    { key: "hotel", label: "Khách sạn", icon: "🏨" },
    { key: "flight", label: "Vé máy bay", icon: "✈️" },
  ];

  return (
    <div className="p-4 sm:p-5">
      {/* Tab Headers */}
      <div className="flex gap-1 bg-gray-50 p-1 rounded-xl mb-5" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/60"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search Form theo tab */}
      {activeTab === "tour" && <TourSearchForm />}
      {activeTab === "hotel" && <HotelSearchForm />}
      {activeTab === "flight" && <PlaceholderForm label="Tìm vé máy bay" />}
    </div>
  );
}

/**
 * TourSearchForm — Form tìm kiếm tour với điểm đến, ngày đi, giá.
 */
function TourSearchForm() {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: Navigate to /search page with params
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Điểm đến */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-500 mb-1">Điểm đến</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <select
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>
                Chọn điểm đến
              </option>
              <option value="ha-long">Hạ Long</option>
              <option value="da-nang">Đà Nẵng</option>
              <option value="hoi-an">Hội An</option>
              <option value="nha-trang">Nha Trang</option>
              <option value="phu-quoc">Phú Quốc</option>
              <option value="da-lat">Đà Lạt</option>
              <option value="sapa">Sapa</option>
            </select>
          </div>
        </div>

        {/* Ngày đi */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ngày đi</label>
          <input
            type="date"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Khoảng giá */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Khoảng giá</label>
          <select
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            defaultValue=""
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
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-8 py-3 rounded-xl transition-colors duration-200 shadow-sm hover:shadow-md"
      >
        🔍 Tìm tour ngay
      </button>
    </form>
  );
}

/**
 * PlaceholderForm — Form tạm cho hotel/flight tab (sẽ phát triển sau).
 * @param {{ label: string }} props
 */
function PlaceholderForm({ label }) {
  return (
    <div className="flex items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
      <p className="text-sm text-gray-400">{label} — sắp ra mắt</p>
    </div>
  );
}