import { searchHotels, getLocations, countHotels, enrichHotelsWithLowestPrices } from "@/lib/firestore-admin";
import { resolveDocsImages } from "@/lib/storage-admin";
import { PAGE_SIZE } from "@/lib/constants";
import Breadcrumb from "@/components/layout/Breadcrumb";
import HotelFilters from "@/components/hotels/HotelFilters";
import ServiceList from "@/components/shared/ServiceList";
import SearchFormPopup from "@/components/shared/SearchFormPopup";

export const metadata = {
  title: "Khách Sạn & Nghỉ Dưỡng — 9 Trip",
  description: "Đặt phòng khách sạn, resort giá tốt nhất. Hỗ trợ đặt phòng 24/7.",
  openGraph: {
    title: "Khách Sạn & Nghỉ Dưỡng — 9 Trip",
    description: "Đặt phòng khách sạn, resort giá tốt nhất. Hỗ trợ đặt phòng 24/7.",
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
    type: "website",
    locale: "vi_VN",
  },
  alternates: { canonical: "/hotels" },
};

export const revalidate = 3600;

export default async function HotelsPage({ searchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filters = {
    locationId: params.locationId || "",
    starRating: params.starRating || "",
    minPrice: params.minPrice ? Number(params.minPrice) : null,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : null,
    amenities: params.amenities || "",
    sortBy: params.sortBy || "newest",
    pageSize: PAGE_SIZE,
    page,
  };

  const [{ hotels: rawHotels }, locations, totalCount] = await Promise.all([
    searchHotels(filters),
    getLocations(),
    countHotels({ locationId: params.locationId || "" }),
  ]);

  let hotels = await resolveDocsImages(rawHotels);
  hotels = await enrichHotelsWithLowestPrices(hotels);

  if (filters.minPrice != null) {
    hotels = hotels.filter((h) => (h.lowestPrice || h.pricing?.basePrice || 0) >= filters.minPrice);
  }
  if (filters.maxPrice != null) {
    hotels = hotels.filter((h) => (h.lowestPrice || h.pricing?.basePrice || 0) <= filters.maxPrice);
  }

  if (filters.sortBy === "price_asc") {
    hotels.sort((a, b) => (a.lowestPrice || a.pricing?.basePrice || 0) - (b.lowestPrice || b.pricing?.basePrice || 0));
  } else if (filters.sortBy === "price_desc") {
    hotels.sort((a, b) => (b.lowestPrice || b.pricing?.basePrice || 0) - (a.lowestPrice || a.pricing?.basePrice || 0));
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Khách sạn",
    description: "Danh sách khách sạn và resort.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com"}/hotels`,
    numberOfItems: totalCount,
    itemListElement: hotels.slice(0, 10).map((h, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/hotels/${h.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-muted pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Khách sạn", href: "/hotels" },
        ]}
      />

      <div className="bg-card border-b border-border mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Khách Sạn & Nghỉ Dưỡng
          </h1>
          <p className="text-muted-foreground">Tìm kiếm nơi dừng chân hoàn hảo cho chuyến đi của bạn</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <SearchFormPopup
            type="hotel"
            locations={locations}
            currentFilters={filters}
          />
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-card rounded-xl border border-border sticky top-24">
              <HotelFilters locations={locations} />
            </div>
          </aside>

          <div className="flex-1">
            <ServiceList
              items={hotels}
              totalCount={totalCount}
              totalPages={totalPages}
              type="hotel"
              emptyTitle="Không tìm thấy khách sạn nào"
              emptyMessage="Thử thay đổi bộ lọc hoặc tìm kiếm ở khu vực khác nhé."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
