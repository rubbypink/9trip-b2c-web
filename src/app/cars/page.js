import { Suspense } from "react";
import { searchCars, countCars } from "@/lib/firestore-admin";
import { PAGE_SIZE } from "@/lib/constants";
import Breadcrumb from "@/components/layout/Breadcrumb";
import CarFilters from "@/components/cars/CarFilters";
import ServiceList from "@/components/shared/ServiceList";

export const metadata = {
  title: "Thuê Xe Du Lịch — 9 Trip",
  description: "Dịch vụ cho thuê xe du lịch tự lái hoặc có tài xế, đa dạng dòng xe, giá cả cạnh tranh.",
  openGraph: {
    title: "Thuê Xe Du Lịch — 9 Trip",
    description: "Dịch vụ cho thuê xe du lịch tự lái hoặc có tài xế, đa dạng dòng xe, giá cả cạnh tranh.",
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
    type: "website",
    locale: "vi_VN",
  },
  alternates: { canonical: "/cars" },
};

export const revalidate = 3600;

export default async function CarsPage({ searchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filters = {
    carType: params.carType || "",
    transmission: params.transmission || "",
    sortBy: params.sortBy || "newest",
    pageSize: PAGE_SIZE,
    page,
  };

  const [{ cars }, totalCount] = await Promise.all([
    searchCars(filters),
    countCars({ carType: params.carType || "", transmission: params.transmission || "" }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Thuê xe du lịch",
    description: "Danh sách xe du lịch cho thuê.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com"}/cars`,
    numberOfItems: totalCount,
    itemListElement: cars.slice(0, 10).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/cars/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-muted pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Thuê xe", href: "/cars" },
        ]}
      />

      <div className="bg-card border-b border-border mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Thuê Xe Du Lịch
          </h1>
          <p className="text-muted-foreground">Đa dạng dòng xe, hành trình thoải mái</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-card rounded-xl border border-border sticky top-24">
              <CarFilters />
            </div>
          </aside>

          <div className="flex-1">
            <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-muted rounded-xl aspect-[16/10] animate-pulse" />
              ))}
            </div>}>
              <ServiceList 
                items={cars}
                totalCount={totalCount}
                totalPages={totalPages}
                type="car"
                emptyTitle="Không tìm thấy xe nào"
                emptyMessage="Thử thay đổi bộ lọc hoặc loại xe khác nhé."
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
