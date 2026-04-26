/**
 * SearchTabs - Thanh tab tìm kiếm đa dịch vụ (Tour, Hotel, Activity, Car).
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TABS = [
  { key: "tour", label: "🎯 Tour", icon: "🎯" },
  { key: "hotel", label: "🏨 Khách sạn", icon: "🏨" },
  { key: "activity", label: "🎪 Hoạt động", icon: "🎪" },
  { key: "car", label: "🚗 Thuê xe", icon: "🚗" },
];

export default function SearchTabs() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tour");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [guests, setGuests] = useState({ adults: 2, children: 0 });

  const activeTabData = TABS.find((t) => t.key === activeTab);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set("location", destination);
    if (startDate) params.set("date", startDate);
    params.set("adults", guests.adults);
    params.set("children", guests.children);

    const pathMap = {
      tour: "/tours",
      hotel: "/hotels",
      activity: "/activities",
      car: "/cars",
    };
    const path = pathMap[activeTab] || "/tours";
    router.push(`${path}?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-4 px-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label.replace(/[^\w\sÀ-ỹ]/g, "").replace(tab.icon, "").trim()}
          </button>
        ))}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Destination */}
          <div className="md:col-span-1">
            <label className="block text-xs text-gray-500 mb-1 font-medium">
              Điểm đến
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Bạn muốn đi đâu?"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700"
            />
          </div>

          {/* Date */}
          <div className="md:col-span-1">
            <label className="block text-xs text-gray-500 mb-1 font-medium">
              {activeTab === "hotel" ? "Nhận phòng" : "Ngày đi"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700"
            />
          </div>

          {/* Guests */}
          <div className="md:col-span-1">
            <label className="block text-xs text-gray-500 mb-1 font-medium">
              Số khách
            </label>
            <div className="flex items-center gap-2">
              <select
                value={guests.adults}
                onChange={(e) =>
                  setGuests((g) => ({ ...g, adults: Number(e.target.value) }))
                }
                className="flex-1 px-2 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} NL
                  </option>
                ))}
              </select>
              <select
                value={guests.children}
                onChange={(e) =>
                  setGuests((g) => ({ ...g, children: Number(e.target.value) }))
                }
                className="flex-1 px-2 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} TE
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm shadow-lg shadow-blue-600/25"
            >
              🔍 Tìm kiếm
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}