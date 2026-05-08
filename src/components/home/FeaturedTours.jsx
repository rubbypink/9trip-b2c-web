import TourCard from "@/components/tours/TourCard";
import EmptyState from "@/components/shared/EmptyState";

/**
 * FeaturedTours — Hiển thị danh sách tour nổi bật dạng grid responsive.
 * @param {{ tours: Array }} props - Dữ liệu tours từ server component.
 */
export default function FeaturedTours({ tours }) {
  if (!tours || tours.length === 0) {
    return (
      <section className="py-8 lg:py-10 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <EmptyState
            title="Chưa có tour nào"
            message="Hiện tại chưa có tour nổi bật. Vui lòng quay lại sau."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 lg:py-10 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <span className="text-primary-600 text-xs font-semibold uppercase tracking-wider">
              Khám phá
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
              Tour nổi bật
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Những tour du lịch được yêu thích nhất, đặt ngay kẻo hết chỗ!
            </p>
          </div>
          <a
            href="/tours"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors shrink-0"
          >
            Xem tất cả
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {tours.slice(0, 4).map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      </div>
    </section>
  );
}