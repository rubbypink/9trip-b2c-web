"use client";

import { useEffect, useRef } from "react";
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
  params.delete("page");
  const filterStr = params.toString();
  return `${type}:${filterStr ? filterStr : "default"}`;
}

function buildPageKey(type, searchParams, page) {
  const params = new URLSearchParams(searchParams);
  params.set("page", page);
  return `?${params.toString()}`;
}

/**
 * ServiceList — "use client" listing component.
 * Renders service cards based on a string `type` prop to avoid serialization errors
 * that occur when passing React components (functions) from Server to Client Components.
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
  const setPageData = useListingStore((s) => s.setPageData);
  const prefetchedPages = useRef(new Set());

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (items.length > 0) {
      const filterKey = buildCacheKey(type, searchParams);
      setPageData(filterKey, {
        items,
        totalCount,
        totalPages,
        currentPage,
      });
    }
  }, [items, totalCount, totalPages, currentPage, type, searchParams, setPageData]);

  useEffect(() => {
    prefetchedPages.current.clear();
    if (currentPage < totalPages && totalPages > 1) {
      const nextUrl = buildPageKey(type, searchParams, currentPage + 1);
      prefetchedPages.current.add(nextUrl);
      router.prefetch(nextUrl);
    }
  }, [currentPage, totalPages, type, searchParams, router]);

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  const CardComponent = CARD_MAP[type] || HotelCard;

  return (
    <div>
      <div className={gridClassName + " mb-10"}>
        {items.map((item) => (
          <CardComponent key={item.id} item={item} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
