import { Suspense } from "react";
import { searchCars } from "@/lib/firestore";
import Breadcrumb from "@/components/layout/Breadcrumb";
import CarFilters from "@/components/cars/CarFilters";
import ServiceList from "@/components/shared/ServiceList";

export const metadata = {
  title: "Thuê Xe Du Lịch — 9Trip",
  description: "Dịch vụ cho thuê xe du lịch tự lái hoặc có tài xế, đa dạng dòng xe, giá cả cạnh tranh.",
};

export const revalidate = 3600;

/**
 * Cars Page — Listing dịch vụ thuê xe.
 */
export default async function CarsPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    carType: params.carType || "",
    transmission: params.transmission || "",
    sortBy: params.sortBy || "newest",
    pageSize: 12,
  };

  const { cars } = await searchCars(filters);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Thuê xe", href: "/cars" },
        ]}
      />

      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Thuê Xe Du Lịch
          </h1>
          <p className="text-gray-500">Đa dạng dòng xe, hành trình thoải mái</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
              <CarFilters />
            </div>
          </aside>

          <div className="flex-1">
            <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-xl aspect-[16/10] animate-pulse" />
              ))}
            </div>}>
              <ServiceList 
                items={cars}
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
