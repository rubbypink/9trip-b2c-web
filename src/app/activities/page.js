import { searchActivities, getLocations } from "@/lib/firestore-admin";
import { resolveDocsImages } from "@/lib/storage-admin";
import { PAGE_SIZE } from "@/lib/constants";
import { logger } from "@/lib/logger";
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
    { id: "Tham quan", name: "Tham quan" },
    { id: "Mạo hiểm", name: "Mạo hiểm" },
    { id: "Thể thao dưới nước", name: "Thể thao dưới nước" },
    { id: "Sinh thái", name: "Sinh thái" },
    { id: "Lớp học & Workshop", name: "Lớp học & Workshop" },
  ];

  let activities = [];
  let locations = [];
  let totalCount = 0;

  try {
    const [{ activities: rawActivities, totalCount: count = 0 }, locs] = await Promise.all([
      searchActivities(filters),
      getLocations(),
    ]);
    activities = await resolveDocsImages(rawActivities);
    locations = locs;
    totalCount = count;
  } catch (error) {
    logger.error("[ActivitiesPage] Error loading data:", error.message);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
    <div className="min-h-screen bg-background pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Hoạt động", href: "/activities" },
        ]}
      />

      <div className="bg-card border-b border-border mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Hoạt Động & Vui Chơi
          </h1>
          <p className="text-muted-foreground">Trải nghiệm những khoảnh khắc tuyệt vời cùng người thân</p>
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