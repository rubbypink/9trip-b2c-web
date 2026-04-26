import { Suspense } from "react";
import { getFeaturedTours } from "@/lib/firestore";
import TourCard from "@/components/tours/TourCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Link from "next/link";

/**
 * FeaturedTours — Server Component hiển thị danh sách tour nổi bật.
 * Fetch dữ liệu trực tiếp từ Firestore.
 */
async function FeaturedToursList() {
  let tours = [];
  try {
    tours = await getFeaturedTours(6);
  } catch (error) {
    console.error("Failed to load featured tours:", error);
  }

  if (!tours || tours.length === 0) {
    return (
      <p className="text-center text-gray-500">Chưa có tour nổi bật nào. Vui lòng quay lại sau.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tours.map((tour) => (
        <TourCard key={tour.id} tour={tour} />
      ))}
    </div>
  );
}

/**
 * FeaturedTours — Section Server Component với Suspense boundary.
 */
export default function FeaturedTours() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Tour nổi bật</h2>
          <p className="mt-2 text-sm text-gray-500">
            Những tour du lịch được yêu thích nhất trong tháng
          </p>
        </div>
        <Link
          href="/tours"
          className="hidden text-sm font-semibold text-primary hover:text-primary-dark sm:block"
        >
          Xem tất cả →
        </Link>
      </div>

      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <FeaturedToursList />
      </Suspense>

      <div className="mt-8 text-center sm:hidden">
        <Link
          href="/tours"
          className="text-sm font-semibold text-primary hover:text-primary-dark"
        >
          Xem tất cả tour →
        </Link>
      </div>
    </section>
  );
}