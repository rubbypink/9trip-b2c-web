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
    const rawHotels = await getFeaturedHotels(8);
    hotels = await resolveDocsImages(rawHotels);
    hotels = await enrichHotelsWithLowestPrices(hotels);
  } catch {
    // Firestore unavailable — render empty gracefully
  }

  if (!hotels || hotels.length === 0) return null;

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">
              Chỗ ở tuyệt vời
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mt-2">
              Khách sạn nổi bật
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Những khách sạn được yêu thích nhất với chất lượng đảm bảo và giá tốt nhất.
            </p>
          </div>
          <Link
            href="/hotels"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors shrink-0"
          >
            Xem tất cả
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Hotel grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} isFeatured={true} />
          ))}
        </div>
      </div>
    </section>
  );
}
