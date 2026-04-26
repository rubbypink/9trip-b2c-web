"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TABS = [
  { id: "tours", label: "Tour", icon: "🏝️" },
  { id: "hotels", label: "Khách sạn", icon: "🏨" },
  { id: "activities", label: "Hoạt động", icon: "🎯" },
  { id: "cars", label: "Thuê xe", icon: "🚗" },
];

/**
 * SearchTabsClient — Client Component cho Hero Search với tabs chuyển đổi giữa các loại dịch vụ.
 * Có interactivity (tab switching, form submit) nên phải là Client Component.
 */
export default function SearchTabsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tours");
  const [destination, setDestination] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set("location", destination);
    router.push(`/${activeTab}?${params.toString()}`);
  }

  return (
    <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl sm:p-6">
      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary bg-primary/5 text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Bạn muốn đi đâu?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Tìm kiếm
        </button>
      </form>
    </div>
  );
}