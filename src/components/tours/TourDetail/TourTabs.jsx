"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * TourTabs — tab navigation cho trang chi tiết tour.
 * @param {{
 *   tabs: Array<{ id: string, label: string, icon?: React.ReactNode }>,
 *   activeTab: string,
 *   onTabChange: (tabId: string) => void,
 *   className?: string,
 * }} props
 */
export default function TourTabs({ tabs = [], activeTab, onTabChange, className }) {
  if (!tabs || tabs.length === 0) return null;

  return (
    <div className={cn("border-b border-gray-200", className)}>
      <nav className="flex gap-0 -mb-px overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}