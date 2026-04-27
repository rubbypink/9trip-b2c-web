import { notFound } from "next/navigation";
import { getHotelBySlug, getRoomsByHotel, getRelatedHotels, getRoomPricing, getHotelReviews } from "@/lib/firestore";
import { resolveDocImages, resolveDocsImages } from "@/lib/storage";
import Breadcrumb from "@/components/layout/Breadcrumb";
import HotelHeader from "@/components/hotels/HotelHeader";
import HotelDetailClient from "./HotelDetailClient";
import HotelBookingWidget from "@/components/hotels/HotelBookingWidget";

export const revalidate = 3600; // ISR: revalidate sau 1h

/**
 * generateMetadata — dynamic metadata cho SEO khách sạn.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { hotel } = await getHotelBySlug(resolvedParams.slug);

  if (!hotel) return { title: "Khách sạn không tìm thấy — 9Trip" };

  return {
    title: `${hotel.name} — 9Trip`,
    description: hotel.excerpt || `${hotel.name} — đặt phòng giá tốt nhất tại 9Trip.`,
    openGraph: {
      title: `${hotel.name} — 9Trip`,
      description: hotel.excerpt || "",
      images: hotel.featuredImage ? [{ url: hotel.featuredImage, width: 1200, height: 630 }] : [],
      type: "website",
      locale: "vi_VN",
    },
  };
}

/**
 * generateStaticParams — ISR on-demand, không pre-build.
 */
export async function generateStaticParams() {
  return [];
}

/**
 * Hotel Detail Page — Server Component (ISR).
 * Hotels v2: Parallel fetch hotel + rooms + roomPricing + reviews + relatedHotels.
 * Sử dụng HotelBookingWidget (đầy đủ date picker, guest selector, promo code, total calc).
 * Layout 2/3 content + 1/3 sidebar sticky.
 *
 * URL: /hotels/[slug]
 */
export default async function HotelDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Fetch hotel first (cần hotel.id cho các fetch khác)
  const { hotel: rawHotel } = await getHotelBySlug(slug);

  if (!rawHotel) notFound();

  // Parallel fetch rooms, reviews, related hotels
  const [rawRooms, { hotels: rawRelatedHotels }, { reviews, totalRating, avgRating }] = await Promise.all([
    getRoomsByHotel(rawHotel.id),
    getRelatedHotels(slug, rawHotel.address?.cityId, 3),
    getHotelReviews(slug),
  ]);

  // Fetch pricing tiers cho mỗi room song song
  const roomsWithPricing = rawRooms.length > 0
    ? await Promise.all(
        rawRooms.map(async (room) => {
          const pricingTiers = await getRoomPricing(room.id);
          return { ...room, pricingTiers };
        })
      )
    : [];

  // Resolve image URLs (gs:// → HTTPS)
  const [hotel, relatedHotels] = await Promise.all([
    resolveDocImages(rawHotel),
    resolveDocsImages(rawRelatedHotels),
  ]);

  // JSON-LD Hotel schema cho SEO (mở rộng với room data)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    description: hotel.excerpt || hotel.description?.replace(/<[^>]*>/g, "").slice(0, 200),
    image: hotel.featuredImage,
    url: `/hotels/${slug}`,
    ...(hotel.starRating && { starRating: { "@type": "Rating", ratingValue: hotel.starRating } }),
    ...(hotel.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: hotel.address.street || "",
        addressLocality: hotel.address.city || "",
        addressCountry: hotel.address.country || "VN",
      },
    }),
    ...(hotel.pricing?.basePrice && {
      priceRange: `${hotel.pricing.basePrice} ${hotel.pricing.currency || "VND"}`,
    }),
    ...(avgRating > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount: totalRating,
      },
    }),
    ...(hotel.amenities?.length > 0 && {
      amenityFeature: hotel.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a })),
    }),
    ...(roomsWithPricing.length > 0 && {
      containsPlace: roomsWithPricing.map((r) => ({
        "@type": "HotelRoom",
        name: r.name,
        description: r.description?.replace(/<[^>]*>/g, "").slice(0, 150) || "",
        ...(r.price > 0 && {
          offers: {
            "@type": "Offer",
            price: r.promoPrice || r.price,
            priceCurrency: r.currency || "VND",
          },
        }),
      })),
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gray-50">
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Khách sạn", href: "/hotels" },
            { label: hotel.name },
          ]}
        />

        <HotelHeader hotel={hotel} />

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content (2/3) */}
            <div className="flex-1 min-w-0">
              <HotelDetailClient
                hotel={hotel}
                rooms={roomsWithPricing}
                reviews={reviews || []}
                avgRating={avgRating || hotel.rating?.average || 0}
                totalRating={totalRating || hotel.rating?.count || 0}
                relatedHotels={relatedHotels}
              />
            </div>

            {/* Booking Sidebar (1/3) — sticky */}
            <aside className="w-full lg:w-[380px] flex-shrink-0">
              <div className="sticky top-24">
                <HotelBookingWidget
                  hotelId={hotel.id}
                  hotelName={hotel.name}
                  rooms={roomsWithPricing}
                  basePrice={hotel.pricing?.basePrice || 0}
                  currency={hotel.pricing?.currency || "VND"}
                />
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 shadow-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Giá từ</p>
              <p className="text-lg font-bold text-primary">
                {roomsWithPricing.length > 0
                  ? (() => {
                      const prices = roomsWithPricing.map((r) => r.promoPrice || r.price || 0).filter(Boolean);
                      const minPrice = prices.length > 0 ? Math.min(...prices) : hotel.pricing?.basePrice || 0;
                      return minPrice > 0 ? new Intl.NumberFormat("vi-VN", { style: "decimal" }).format(minPrice) + " ₫" : "Liên hệ";
                    })()
                  : hotel.pricing?.basePrice > 0
                    ? new Intl.NumberFormat("vi-VN", { style: "decimal" }).format(hotel.pricing.basePrice) + " ₫"
                    : "Liên hệ"}
                /đêm
              </p>
            </div>
            <button
              onClick={() => {
                document.querySelector('[class*="HotelBookingWidget"]')?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-xl bg-primary text-white font-semibold text-sm px-6 py-3 hover:bg-primary-dark transition-colors shadow-sm"
            >
              Chọn phòng
            </button>
          </div>
        </div>
        {/* Spacer for mobile bottom bar */}
        <div className="h-20 lg:hidden" />
      </div>
    </>
  );
}
