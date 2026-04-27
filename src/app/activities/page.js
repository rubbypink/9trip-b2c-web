import { Suspense } from "react";
import { searchActivities, getLocations } from "@/lib/firestore";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ActivityFilters from "@/components/activities/ActivityFilters";
import ServiceList from "@/components/shared/ServiceList";

export const metadata = {
  title: "Hoạt Động & Vui Chơi — 9Trip",
  description: "Khám phá các hoạt động vui chơi, tham quan hấp dẫn tại các điểm du lịch nổi tiếng.",
};

export const revalidate = 3600;

/**
 * Activities Page — Listing các hoạt động vui chơi.
 */
export default async function ActivitiesPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    locationId: params.locationId || "",
    categoryId: params.categoryId || "",
    minPrice: params.minPrice ? Number(params.minPrice) : null,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : null,
    sortBy: params.sortBy || "newest",
    pageSize: 12,
  };

  // Mock categories for now - in production this would come from firestore
  const categories = [
    { id: "sightseeing", name: "Tham quan" },
    { id: "adventure", name: "Mạo hiểm" },
    { id: "water-sports", name: "Thể thao dưới nước" },
    { id: "eco-tour", name: "Sinh thái" },
    { id: "workshop", name: "Lớp học & Workshop" },
  ];

  const [{ activities }, locations] = await Promise.all([
    searchActivities(filters),
    getLocations(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Hoạt động", href: "/activities" },
        ]}
      />

      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Hoạt Động & Vui Chơi
          </h1>
          <p className="text-gray-500">Trải nghiệm những khoảnh khắc tuyệt vời cùng người thân</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside>
            <ActivityFilters locations={locations} categories={categories} />
          </aside>

          <div className="flex-1">
            <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-xl aspect-[4/5] animate-pulse" />
              ))}
            </div>}>
              <ServiceList 
                items={activities}
                type="activity"
                emptyTitle="Không tìm thấy hoạt động nào"
                emptyMessage="Thử thay đổi bộ lọc hoặc tìm kiếm ở địa điểm khác nhé."
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
