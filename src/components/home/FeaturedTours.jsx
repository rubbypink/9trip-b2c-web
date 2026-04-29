import TourCard from "@/components/tours/TourCard";
import EmptyState from "@/components/shared/EmptyState";

/**
 * FeaturedTours — Hiển thị danh sách tour nổi bật dạng grid responsive.
 * @param {{ tours: Array }} props - Dữ liệu tours từ server component.
 */
export default function FeaturedTours({ tours }) {
  if (!tours || tours.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState
          title="Chưa có tour nào"
          message="Hiện tại chưa có tour nổi bật. Vui lòng quay lại sau."
        />
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">
            Khám phá
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
            Tour nổi bật
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            Những tour du lịch được yêu thích nhất, đặt ngay kẻo hết chỗ!
          </p>
        </div>
        <a
          href="/search?featured=true"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors shrink-0"
        >
          Xem tất cả
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Tour Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tours.map((tour) => (
          <TourCard key={tour.id} tour={tour} />
        ))}
      </div>
    </section>
  );
}