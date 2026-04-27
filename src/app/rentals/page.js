import { Suspense } from "react";
import Link from "next/link";
import { searchRentals } from "@/lib/firestore";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ServiceList from "@/components/shared/ServiceList";

export const metadata = {
  title: "Dịch Vụ Cho Thuê — 9Trip",
  description: "Cho thuê xe máy, trang phục, dụng cụ du lịch và các dịch vụ đi kèm khác.",
};

export const revalidate = 3600;

/**
 * Rentals Page — Listing các dịch vụ cho thuê khác.
 */
export default async function RentalsPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    type: params.type || "",
    sortBy: params.sortBy || "newest",
    pageSize: 12,
  };

  const { rentals } = await searchRentals(filters);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Dịch vụ cho thuê", href: "/rentals" },
        ]}
      />

      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Dịch Vụ Cho Thuê
          </h1>
          <p className="text-gray-500">Mọi thứ bạn cần cho một chuyến đi trọn vẹn</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Quick Filters - can be expanded later */}
          <aside className="w-full lg:w-64 flex-shrink-0">
             <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">Loại dịch vụ</h3>
                <div className="space-y-2">
                  {["Xe máy", "Trang phục", "Dụng cụ", "Khác"].map((t) => (
                    <Link 
                      key={t}
                      href={`/rentals?type=${t}`}
                      className={`block px-3 py-2 rounded-lg text-sm ${params.type === t ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
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
                <div key={i} className="bg-gray-200 rounded-xl aspect-[4/3] animate-pulse" />
              ))}
            </div>}>
              <ServiceList 
                items={rentals}
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
