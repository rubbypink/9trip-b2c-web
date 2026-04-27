"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * HotelSearchForm — Form tìm kiếm khách sạn trên homepage.
 * Gồm: điểm đến, ngày nhận phòng, ngày trả phòng, số khách, nút tìm kiếm.
 */
export default function HotelSearchForm() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  /** Điểm đến phổ biến */
  const destinations = [
    { value: "", label: "Tất cả điểm đến" },
    { value: "phu-quoc", label: "Phú Quốc" },
    { value: "da-nang", label: "Đà Nẵng" },
    { value: "nha-trang", label: "Nha Trang" },
    { value: "hoi-an", label: "Hội An" },
    { value: "ha-long", label: "Hạ Long" },
    { value: "da-lat", label: "Đà Lạt" },
    { value: "sapa", label: "Sapa" },
    { value: "hue", label: "Huế" },
    { value: "ho-chi-minh", label: "TP. Hồ Chí Minh" },
  ];

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (checkin) params.set("checkin", checkin);
    if (checkout) params.set("checkout", checkout);
    if (adults > 0) params.set("adults", String(adults));
    if (children > 0) params.set("children", String(children));

    router.push(`/hotels${params.toString() ? `?${params.toString()}` : ""}`);
  }

  // Set default check-in to today
  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Điểm đến */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Điểm đến
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            >
              {destinations.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ngày nhận phòng */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Nhận phòng
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="date"
              value={checkin}
              min={today}
              onChange={(e) => setCheckin(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Ngày trả phòng */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Trả phòng
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="date"
              value={checkout}
              min={checkin || today}
              onChange={(e) => setCheckout(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Số khách */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Khách
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <div className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
              <span>
                {adults + children} khách
                {children > 0 && ` (${adults} NL, ${children} TE)`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Guest selector expanded */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Người lớn:</span>
          <button
            type="button"
            onClick={() => setAdults(Math.max(1, adults - 1))}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm"
          >
            −
          </button>
          <span className="text-sm font-medium w-5 text-center">{adults}</span>
          <button
            type="button"
            onClick={() => setAdults(Math.min(10, adults + 1))}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Trẻ em:</span>
          <button
            type="button"
            onClick={() => setChildren(Math.max(0, children - 1))}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm"
          >
            −
          </button>
          <span className="text-sm font-medium w-5 text-center">
            {children}
          </span>
          <button
            type="button"
            onClick={() => setChildren(Math.min(5, children + 1))}
            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm"
          >
            +
          </button>
        </div>
      </div>

      {/* Search button */}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        Tìm khách sạn
      </button>
    </form>
  );
}
