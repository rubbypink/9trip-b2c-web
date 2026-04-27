"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";
import HotelCard from "@/components/shared/HotelCard";
import TourCard from "@/components/shared/TourCard";
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

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page);
    router.push(`?${params.toString()}`, { scroll: false });
  };

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