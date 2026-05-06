"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";
import useListingStore from "@/stores/listing-store";
import HotelCard from "@/components/shared/HotelCard";
import TourCard from "@/components/tours/TourCard";
import ActivityCard from "@/components/shared/ActivityCard";
import CarCard from "@/components/shared/CarCard";
import RentalCard from "@/components/shared/RentalCard";

const CARD_MAP = {
  hotel: HotelCard,
  tour: TourCard,
  activity: ActivityCard,
  car: CarCard,
  rental: RentalCard,
};

function buildCacheKey(type, searchParams) {
  const params = new URLSearchParams(searchParams);
  const page = params.get("page") || "1";
  params.delete("page");
  const filterStr = params.toString();
  return `${type}:${filterStr ? filterStr : "default"}:p${page}`;
}

function buildPageKey(type, searchParams, page) {
  const params = new URLSearchParams(searchParams);
  params.set("page", page);
  return `?${params.toString()}`;
}

/**
 * ServiceList — "use client" listing component.
 * Cache-first rendering: checks zustand cache on mount for instant display,
 * then updates with fresh server data when it arrives.
 *
 * @param {{
 *   items: Array,
 *   totalCount?: number,
 *   totalPages?: number,
 *   type?: "hotel" | "tour" | "activity" | "car" | "rental",
 *   emptyTitle?: string,
 *   emptyMessage?: string,
 *   gridClassName?: string,
 * }} props
 */
export default function ServiceList({
  items = [],
  totalCount = 0,
  totalPages = 1,
  type = "hotel",
  emptyTitle,
  emptyMessage,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6",
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const cacheKey = buildCacheKey(type, searchParams);
  const getPageData = useListingStore((s) => s.getPageData);
  const setPageData = useListingStore((s) => s.setPageData);
  const prefetchedPages = useRef(new Set());

  const [displayItems, setDisplayItems] = useState(() => {
    const cached = getPageData(cacheKey);
    if (cached?.items?.length > 0) return cached.items;
    return items;
  });
  const [displayTotalCount, setDisplayTotalCount] = useState(() => {
    const cached = getPageData(cacheKey);
    if (cached?.totalCount != null && cached.totalCount > 0) return cached.totalCount;
    return totalCount;
  });
  const [displayTotalPages, setDisplayTotalPages] = useState(() => {
    const cached = getPageData(cacheKey);
    if (cached?.totalPages != null && cached.totalPages > 0) return cached.totalPages;
    return totalPages;
  });

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (items.length > 0) {
      setDisplayItems(items);
      setDisplayTotalCount(totalCount);
      setDisplayTotalPages(totalPages);
      setPageData(cacheKey, {
        items,
        totalCount,
        totalPages,
        currentPage,
      });
    }
  }, [items, totalCount, totalPages, currentPage, cacheKey, setPageData]);

  useEffect(() => {
    prefetchedPages.current.clear();
    if (currentPage < totalPages && totalPages > 1) {
      const nextUrl = buildPageKey(type, searchParams, currentPage + 1);
      prefetchedPages.current.add(nextUrl);
      router.prefetch(nextUrl);
    }
  }, [currentPage, totalPages, type, searchParams, router]);

  if (displayItems.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  const CardComponent = CARD_MAP[type] || HotelCard;

  return (
    <div>
      <div className={gridClassName + " mb-10"}>
        {displayItems.map((item) => (
          <CardComponent key={item.id} item={item} />
        ))}
      </div>

      {displayTotalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={displayTotalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
