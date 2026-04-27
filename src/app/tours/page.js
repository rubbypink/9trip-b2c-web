import { Suspense } from "react";
import { searchTours, getLocations } from "@/lib/firestore";
import { resolveDocsImages } from "@/lib/storage";
import Breadcrumb from "@/components/layout/Breadcrumb";
import TourFilters from "@/components/tours/TourFilters";
import ServiceList from "@/components/shared/ServiceList";
import SearchFormPopup from "@/components/shared/SearchFormPopup";

export const metadata = {
  title: "Tìm Tour Du Lịch — 9Trip",
  description: "Tìm kiếm và đặt tour du lịch trong nước và quốc tế với giá tốt nhất.",
};

export const revalidate = 3600; // ISR: revalidate sau 1h

/**
 * Tours Search Page — Server Component (SSR with ISR).
 * Hiển thị danh sách tour với bộ lọc, sắp xếp, phân trang.
 *
 * Search params: locationId, tourTypeId, minPrice, maxPrice, minRating, sortBy
 */
export default async function ToursPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    locationId: params.locationId || "",
    tourTypeId: params.tourTypeId || "",
    minPrice: params.minPrice ? Number(params.minPrice) : "",
    maxPrice: params.maxPrice ? Number(params.maxPrice) : "",
    minRating: params.minRating ? Number(params.minRating) : "",
    sortBy: params.sortBy || "newest",
  };

  // Fetch initial data
  const [{ tours: rawTours }, locations] = await Promise.all([
    searchTours(filters),
    getLocations(),
  ]);

  // Resolve image URLs (gs:// → HTTPS)
  const tours = await resolveDocsImages(rawTours);

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Tours", href: "/tours" },
        ]}
      />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Tìm Tour Du Lịch
          </h1>
          <p className="text-gray-500">Khám phá hàng trăm tour du lịch hấp dẫn</p>
        </div>
      </div>

      {/* Search Form (Quick change search) */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <SearchFormPopup type="tour" locations={locations} currentFilters={filters} />
      </div>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <Suspense fallback={<div className="h-96 bg-gray-100 rounded-xl animate-pulse" />}>
              <TourFilters locations={locations} currentFilters={filters} />
            </Suspense>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Suspense
              fallback={
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              }
            >
              <ServiceList 
                items={tours}
                type="tour"
                emptyTitle="Không tìm thấy tour nào"
                emptyMessage="Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác."
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
