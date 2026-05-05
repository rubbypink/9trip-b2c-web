import Link from "next/link";
import Image from "next/image";
import { getFeaturedHotels, enrichHotelsWithLowestPrices } from "@/lib/firestore-admin";
import { resolveDocsImages } from "@/lib/storage-admin";
import { formatCurrency } from "@/lib/utils";

/**
 * FeaturedHotelsServer — Server component hiển thị khách sạn nổi bật.
 * Fetch dữ liệu trực tiếp từ Firestore.
 */
export default async function FeaturedHotelsServer() {
  let hotels = [];
  try {
    const rawHotels = await getFeaturedHotels(6);
    hotels = await resolveDocsImages(rawHotels);
    hotels = await enrichHotelsWithLowestPrices(hotels);
  } catch {
    // Firestore unavailable — render empty gracefully
  }

  if (!hotels || hotels.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-10">
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">
            Chỗ ở tuyệt vời
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-2">
            Khách sạn nổi bật
          </h2>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
            Những khách sạn được yêu thích nhất với chất lượng đảm bảo và giá tốt nhất.
          </p>
        </div>

        {/* Hotel grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <Link
              key={hotel.id}
              href={`/hotels/${hotel.slug}`}
              data-service-type="hotel"
              data-service-id={hotel.id}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              {/* Image */}
              <div className="aspect-[16/10] relative overflow-hidden">
                {typeof hotel.featuredImage === "string" &&
                hotel.featuredImage.startsWith("http") ? (
                  <Image
                    src={hotel.featuredImage}
                    alt={hotel.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
                {/* Star rating badge */}
                {hotel.starRating > 0 && (
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-yellow-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {"★".repeat(Math.min(hotel.starRating, 5))}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="text-xs text-gray-500">
                    {hotel.address?.city || hotel.address?.area || "—"}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {hotel.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-lg font-bold text-blue-600">
                    {hotel.lowestPrice > 0
                      ? formatCurrency(hotel.lowestPrice, hotel.pricing?.currency || "VND")
                      : "Liên hệ"}
                  </span>
                  {hotel.lowestPrice > 0 && (
                    <span className="text-xs text-gray-500">/ đêm</span>
                  )}
                </div>
                {/* Rating */}
                {hotel.rating?.average > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-yellow-500 text-sm">★</span>
                    <span className="text-sm font-medium text-gray-700">
                      {hotel.rating.average.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({hotel.rating.count || 0} đánh giá)
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* View all link */}
        <div className="text-center mt-10">
          <Link
            href="/hotels"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Xem tất cả khách sạn
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
