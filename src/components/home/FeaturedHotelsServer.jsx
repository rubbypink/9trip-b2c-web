import Link from "next/link";
import { getFeaturedHotels, enrichHotelsWithLowestPrices } from "@/lib/firestore-admin";
import { resolveDocsImages } from "@/lib/storage-admin";
import HotelCard from "@/components/shared/HotelCard";

/**
 * FeaturedHotelsServer — Server component hiển thị khách sạn nổi bật.
 * Fetch dữ liệu trực tiếp từ Firestore.
 */
export default async function FeaturedHotelsServer() {
  let hotels = [];
  try {
    const rawHotels = await getFeaturedHotels(4);
    hotels = await resolveDocsImages(rawHotels);
    hotels = await enrichHotelsWithLowestPrices(hotels);
  } catch {
    // Firestore unavailable — render empty gracefully
  }

  if (!hotels || hotels.length === 0) return null;

  return (
    <section className="py-8 lg:py-10 bg-surface-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">
              Chỗ ở tuyệt vời
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
              Khách sạn nổi bật
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Chất lượng đảm bảo và giá tốt nhất.
            </p>
          </div>
          <Link
            href="/hotels"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors shrink-0"
          >
            Xem tất cả
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} isFeatured={true} />
          ))}
        </div>
      </div>
    </section>
  );
}
