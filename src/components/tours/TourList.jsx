"use client";

import { useState, useCallback } from "react";
import TourCard from "./TourCard";
import SortDropdown from "./SortDropdown";
import { cn } from "@/lib/utils";

/**
 * TourList — danh sách tour với grid/list view toggle, sort, và pagination.
 * @param {{
 *   tours: object[],
 *   totalCount?: number,
 *   onLoadMore?: () => void,
 *   hasMore?: boolean,
 *   loading?: boolean,
 *   className?: string,
 * }} props
 */
export default function TourList({
  tours = [],
  totalCount,
  onLoadMore,
  hasMore = false,
  loading = false,
  className,
}) {
  const [viewMode, setViewMode] = useState("grid");

  if (!loading && tours.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="mx-auto h-16 w-16 text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">Không tìm thấy tour nào</h3>
        <p className="text-sm text-gray-500">
          Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Toolbar: Sort + View Toggle + Count */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {totalCount != null && (
            <p className="text-sm text-gray-500">
              Hiển thị <span className="font-medium text-gray-700">{tours.length}</span> trong{" "}
              <span className="font-medium text-gray-700">{totalCount}</span> tour
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-gray-300 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "grid" ? "bg-primary text-white" : "text-gray-400 hover:text-gray-600"
              )}
              aria-label="Xem dạng lưới"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zM2.5 2a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3zm6.5.5A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm1.5-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3zM1 10.5A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm1.5-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3zm6.5.5A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3zm1.5-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5h-3z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "list" ? "bg-primary text-white" : "text-gray-400 hover:text-gray-600"
              )}
              aria-label="Xem dạng danh sách"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" />
              </svg>
            </button>
          </div>
          <SortDropdown />
        </div>
      </div>

      {/* Tour Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} variant="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} variant="list" />
          ))}
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-primary" />
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            className="rounded-lg border border-primary bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            Xem thêm tour
          </button>
        </div>
      )}
    </div>
  );
}