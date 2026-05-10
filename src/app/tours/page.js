import { searchTours, getLocations, countTours } from "@/lib/firestore-admin";
import { resolveDocsImages } from "@/lib/storage-admin";
import { unstable_cache } from "next/cache";
import { PAGE_SIZE } from "@/lib/constants";
import Breadcrumb from "@/components/layout/Breadcrumb";
import TourFilters from "@/components/tours/TourFilters";
import ServiceList from "@/components/shared/ServiceList";
import SearchFormPopup from "@/components/shared/SearchFormPopup";

export const metadata = {
  title: "Tìm Tour Du Lịch — 9 Trip",
  description: "Tìm kiếm và đặt tour du lịch trong nước và quốc tế với giá tốt nhất.",
  openGraph: {
    title: "Tìm Tour Du Lịch — 9 Trip",
    description: "Tìm kiếm và đặt tour du lịch trong nước và quốc tế với giá tốt nhất.",
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
    type: "website",
    locale: "vi_VN",
  },
  alternates: { canonical: "/tours" },
};

const getCachedTourData = unstable_cache(
  async (filters) => {
    const [{ tours: rawTours }, locations, totalCount] = await Promise.all([
      searchTours(filters),
      getLocations(),
      countTours(filters),
    ]);

    const tours = await resolveDocsImages(rawTours);
    return { tours, locations, totalCount };
  },
  ['tours-list-query'],
  {
    revalidate: 3600,
    tags: ['tours-data']
  }
);

export default async function ToursPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const filters = {
    locationId: params.locationId || "",
    tourTypeId: params.tourTypeId || "",
    minPrice: params.minPrice ? Number(params.minPrice) : "",
    maxPrice: params.maxPrice ? Number(params.maxPrice) : "",
    minRating: params.minRating ? Number(params.minRating) : "",
    sortBy: params.sortBy || "newest",
    pageSize: PAGE_SIZE,
    page,
  };

  const { tours, locations, totalCount } = await getCachedTourData(filters);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tour du lịch",
    description: "Danh sách tour du lịch trong nước và quốc tế.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com"}/tours`,
    numberOfItems: totalCount,
    itemListElement: tours.slice(0, 10).map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/tours/${t.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Tours", href: "/tours" },
        ]}
      />

      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Tìm Tour Du Lịch
          </h1>
          <p className="text-muted-foreground">Khám phá hàng trăm tour du lịch hấp dẫn</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <SearchFormPopup type="tour" locations={locations} currentFilters={filters} />
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-card rounded-xl border border-border sticky top-24">
              <TourFilters locations={locations} currentFilters={filters} />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <ServiceList 
              items={tours}
              type="tour"
              totalCount={totalCount}
              totalPages={totalPages}
              emptyTitle="Không tìm thấy tour nào"
              emptyMessage="Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
