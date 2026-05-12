import Link from "next/link";
import Image from "next/image";
import { getTours } from "@/lib/firestore-admin";
import { formatCurrency } from "@/lib/utils";

/**
 * FlashDealsServer — Server component hiển thị tour giảm giá.
 * Fetch tour có discount từ Firestore.
 */
export default async function FlashDealsServer() {
  let tours = [];
  try {
    const result = await getTours({ pageSize: 8 });
    // Filter tours with promotional pricing (sale price < base price)
    tours = (result.tours || []).filter(
      (t) =>
        t.pricing?.salePrice &&
        t.pricing.salePrice > 0 &&
        t.pricing.salePrice < t.pricing.basePrice
    );
  } catch {
    // Firestore unavailable — render empty gracefully
  }

  if (!tours || tours.length === 0) return null;

  return (
    <section className="py-8 lg:py-10 bg-primary-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-6">
          <span className="text-orange-600 font-semibold text-sm uppercase tracking-wider">
            🔥 Ưu đãi sốc
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mt-2">
            Flash Deals
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Tour giảm giá sốc — số lượng có hạn, đặt ngay kẻo lỡ!
          </p>
        </div>

        {/* Scrollable horizontal cards */}
        <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 scrollbar-hide">
          {tours.map((tour) => {
            const discountPct = tour.pricing?.salePrice
              ? Math.round(
                  (1 - tour.pricing.salePrice / tour.pricing.basePrice) * 100
                )
              : 0;

            return (
              <Link
                key={tour.id}
                href={`/tours/${tour.slug}`}
                className="group flex-shrink-0 w-72 snap-start bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  {typeof tour.featuredImage === "string" &&
                  tour.featuredImage.startsWith("http") ? (
                    <Image
                      src={tour.featuredImage}
                      alt={tour.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="288px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                      </svg>
                    </div>
                  )}
                  {/* Discount badge */}
                  {discountPct > 0 && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      -{discountPct}%
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center gap-1 mb-1">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span className="text-xs text-muted-foreground">{tour.location || tour.locationName || "—"}</span>
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-orange-600 transition-colors line-clamp-2 text-sm">
                    {tour.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(tour.pricing.salePrice, tour.pricing.currency || "VND")}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      {formatCurrency(tour.pricing.basePrice, tour.pricing.currency || "VND")}
                    </span>
                  </div>
                  {/* Timer placeholder */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Số lượng có hạn</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
