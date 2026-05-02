import { Suspense } from "react";
import { searchHotels, getLocations, enrichHotelsWithLowestPrices } from "@/lib/firestore";
import { resolveDocsImages } from "@/lib/storage";
import Breadcrumb from "@/components/layout/Breadcrumb";
import HotelFilters from "@/components/hotels/HotelFilters";
import ServiceList from "@/components/shared/ServiceList";
import SearchFormPopup from "@/components/shared/SearchFormPopup";

export const metadata = {
  title: "Khách Sạn & Nghỉ Dưỡng — 9Trip",
  description: "Đặt phòng khách sạn, resort giá tốt nhất. Hỗ trợ đặt phòng 24/7.",
};

export const revalidate = 3600;

/**
 * Hotels Page — Listing khách sạn.
 */
export default async function HotelsPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    locationId: params.locationId || "",
    starRating: params.starRating || "",
    minPrice: params.minPrice ? Number(params.minPrice) : null,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : null,
    amenities: params.amenities || "",
    sortBy: params.sortBy || "newest",
    pageSize: 12,
  };

  const [{ hotels: rawHotels }, locations] = await Promise.all([
    searchHotels(filters),
    getLocations(),
  ]);

  // Resolve image URLs (gs:// → HTTPS)
  let hotels = await resolveDocsImages(rawHotels);

  // Enrich with lowest prices from hotel_price_schedules
  hotels = await enrichHotelsWithLowestPrices(hotels);

  // Post-enrichment price filtering (v4: uses lowestPrice)
  if (filters.minPrice != null) {
    hotels = hotels.filter((h) => (h.lowestPrice || h.pricing?.basePrice || 0) >= filters.minPrice);
  }
  if (filters.maxPrice != null) {
    hotels = hotels.filter((h) => (h.lowestPrice || h.pricing?.basePrice || 0) <= filters.maxPrice);
  }

  // Post-enrichment price sorting (v4: uses lowestPrice)
  if (filters.sortBy === 'price_asc') {
    hotels.sort((a, b) => (a.lowestPrice || a.pricing?.basePrice || 0) - (b.lowestPrice || b.pricing?.basePrice || 0));
  } else if (filters.sortBy === 'price_desc') {
    hotels.sort((a, b) => (b.lowestPrice || b.pricing?.basePrice || 0) - (a.lowestPrice || a.pricing?.basePrice || 0));
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Khách sạn", href: "/hotels" },
        ]}
      />

      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Khách Sạn & Nghỉ Dưỡng
          </h1>
          <p className="text-gray-500">Tìm kiếm nơi dừng chân hoàn hảo cho chuyến đi của bạn</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Search Form Popup — quick change search */}
        <div className="mb-6">
          <SearchFormPopup
            type="hotel"
            locations={locations}
            currentFilters={filters}
          />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside>
            <HotelFilters locations={locations} />
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-xl aspect-[4/5] animate-pulse" />
              ))}
            </div>}>
              <ServiceList 
                items={hotels}
                type="hotel"
                emptyTitle="Không tìm thấy khách sạn nào"
                emptyMessage="Thử thay đổi bộ lọc hoặc tìm kiếm ở khu vực khác nhé."
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
