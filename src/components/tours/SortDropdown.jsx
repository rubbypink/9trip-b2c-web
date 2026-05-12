"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@9trip/shared/utils";

const sortOptions = [
  { value: "popular", label: "Phổ biến nhất" },
  { value: "price_asc", label: "Giá: Thấp → Cao" },
  { value: "price_desc", label: "Giá: Cao → Thấp" },
  { value: "rating", label: "Đánh giá cao nhất" },
  { value: "newest", label: "Mới nhất" },
];

/**
 * SortDropdown — dropdown sắp xếp kết quả tour.
 * Cập nhật URL searchParams `sort`.
 */
export default function SortDropdown({ className }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "popular";

  const handleSort = (value) => {
    const params = new URLSearchParams(searchParams);
    if (value === "popular") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    router.push(`/tours?${params.toString()}`);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label className="text-sm text-muted-foreground flex-shrink-0">Sắp xếp:</label>
      <select
        value={currentSort}
        onChange={(e) => handleSort(e.target.value)}
        className="rounded-lg border border-border px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}