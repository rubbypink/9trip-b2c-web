import { Suspense } from "react";
import Link from "next/link";
import { searchRentals, countRentals } from "@/lib/firestore-admin";
import { PAGE_SIZE } from "@9trip/shared/constants";
import { logger } from "@9trip/shared/logger";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ServiceList from "@/components/shared/ServiceList";

export const metadata = {
  title: "Dịch Vụ Cho Thuê — 9 Trip",
  description: "Cho thuê xe máy, trang phục, dụng cụ du lịch và các dịch vụ đi kèm khác.",
  openGraph: {
    title: "Dịch Vụ Cho Thuê — 9 Trip",
    description: "Cho thuê xe máy, trang phục, dụng cụ du lịch và các dịch vụ đi kèm khác.",
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630 }],
    type: "website",
    locale: "vi_VN",
  },
  alternates: { canonical: "/rentals" },
};

export default async function RentalsPage({ searchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filters = {
    type: params.type || "",
    sortBy: params.sortBy || "newest",
    pageSize: PAGE_SIZE,
    page,
  };

  let rentals = [];
  let totalCount = 0;

  try {
    const [{ rentals: rawRentals }, count] = await Promise.all([
      searchRentals(filters),
      countRentals({ type: filters.type || "" }),
    ]);
    rentals = rawRentals;
    totalCount = count;
  } catch (error) {
    logger.error("[RentalsPage] Error loading data:", error.message);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dịch vụ cho thuê",
    description: "Danh sách dịch vụ cho thuê.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://9tripphuquoc.com"}/rentals`,
    numberOfItems: totalCount,
    itemListElement: rentals.slice(0, 10).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/rentals/${r.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Dịch vụ cho thuê", href: "/rentals" },
        ]}
      />

      <div className="bg-card border-b border-border mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Dịch Vụ Cho Thuê
          </h1>
          <p className="text-muted-foreground">Mọi thứ bạn cần cho một chuyến đi trọn vẹn</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 flex-shrink-0">
             <div className="bg-card rounded-xl border border-border p-5 sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">Loại dịch vụ</h3>
                <div className="space-y-2">
                  {["Xe máy", "Trang phục", "Dụng cụ", "Khác"].map((t) => (
                    <Link 
                      key={t}
                      href={`/rentals?type=${t}`}
                      className={`block px-3 py-2 rounded-lg text-sm ${params.type === t ? 'bg-blue-50 text-blue-600 font-medium' : 'text-muted-foreground hover:bg-surface-2'}`}
                    >
                      {t}
                    </Link>
                  ))}
                  <Link href="/rentals" className="block px-3 py-2 text-sm text-blue-600 hover:underline">Tất cả</Link>
                </div>
             </div>
          </aside>

          <div className="flex-1">
            <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-muted rounded-xl aspect-[4/3] animate-pulse" />
              ))}
            </div>}>
              <ServiceList 
                items={rentals}
                totalCount={totalCount}
                totalPages={totalPages}
                type="rental"
                emptyTitle="Không tìm thấy dịch vụ nào"
                emptyMessage="Thử thay đổi bộ lọc hoặc xem các danh mục khác nhé."
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
