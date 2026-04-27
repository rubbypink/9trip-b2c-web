"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";

/**
 * ServiceList - Component dùng chung để hiển thị danh sách service với pagination.
 * @param {{
 *   items: any[],
 *   totalCount?: number,
 *   totalPages?: number,
 *   CardComponent: any,
 *   emptyTitle?: string,
 *   emptyMessage?: string,
 *   gridClassName?: string
 * }} props
 */
export default function ServiceList({
  items = [],
  totalCount = 0,
  totalPages = 1,
  CardComponent,
  emptyTitle,
  emptyMessage,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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

  return (
    <div>
      <div className={gridClassName + " mb-10"}>
        {items.map((item) => (
          <CardComponent key={item.id} {...{ [CardComponent.name.toLowerCase().replace('card', '')]: item }} item={item} />
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
