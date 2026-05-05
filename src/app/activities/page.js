import { searchActivities, getLocations } from "@/lib/firestore-admin";
import { resolveDocsImages } from "@/lib/storage-admin";
import { PAGE_SIZE } from "@/lib/constants";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ActivityFilters from "@/components/activities/ActivityFilters";
import ServiceList from "@/components/shared/ServiceList";

export const metadata = {
  title: "Hoạt Động & Vui Chơi — 9 Trip",
  description: "Khám phá các hoạt động vui chơi, tham quan hấp dẫn tại các điểm du lịch nổi tiếng.",
  openGraph: {
    title: "Hoạt Động & Vui Chơi — 9 Trip",
    description: "Khám phá các hoạt động vui chơi, tham quan hấp dẫn tại các điểm du lịch nổi tiếng.",
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
    type: "website",
    locale: "vi_VN",
  },
  alternates: { canonical: "/activities" },
};

export const revalidate = 3600;

export default async function ActivitiesPage({ searchParams }) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const filters = {
    locationId: params.locationId || "",
    categoryId: params.categoryId || "",
    minPrice: params.minPrice ? Number(params.minPrice) : null,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : null,
    sortBy: params.sortBy || "newest",
    pageSize: PAGE_SIZE,
    page,
  };

  const categories = [
    { id: "sightseeing", name: "Tham quan" },
    { id: "adventure", name: "Mạo hiểm" },
    { id: "water-sports", name: "Thể thao dưới nước" },
    { id: "eco-tour", name: "Sinh thái" },
    { id: "workshop", name: "Lớp học & Workshop" },
  ];

  const [{ activities: rawActivities, totalCount = 0 }, locations] = await Promise.all([
    searchActivities(filters),
    getLocations(),
  ]);

  const activities = await resolveDocsImages(rawActivities);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hoạt động & Vui chơi",
    description: "Danh sách hoạt động vui chơi, tham quan.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com"}/activities`,
    numberOfItems: totalCount,
    itemListElement: activities.slice(0, 10).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/activities/${a.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
          <ActivityFilters locations={locations} categories={categories} />

          <div className="flex-1">
            <ServiceList
              items={activities}
              totalCount={totalCount}
              totalPages={totalPages}
              type="activity"
              emptyTitle="Không tìm thấy hoạt động nào"
              emptyMessage="Thử thay đổi bộ lọc hoặc tìm kiếm ở địa điểm khác nhé."
            />
          </div>
        </div>
      </div>
    </div>
  );
}