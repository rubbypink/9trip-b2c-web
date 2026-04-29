import { notFound } from "next/navigation";
import { getHotelBySlug, getRelatedHotels, getHotelReviews, getHotelPriceSchedule, buildRoomPricingTable } from "@/lib/firestore";
import { resolveDocImages, resolveDocsImages } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
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
 * Hotels v4: rooms từ embedded field, pricing từ hotel_price_schedules.
 * Sử dụng buildRoomPricingTable() + RoomsPanel với quantity selector.
 *
 * URL: /hotels/[slug]
 */
export default async function HotelDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Fetch hotel
  const { hotel: rawHotel } = await getHotelBySlug(slug);
  if (!rawHotel) notFound();

  // Parallel: reviews, related hotels, price schedule
  const [
    { reviews, totalRating, avgRating },
    { hotels: rawRelatedHotels },
    priceSchedule,
  ] = await Promise.all([
    getHotelReviews(slug),
    getRelatedHotels(slug, rawHotel.address?.cityId, 3),
    getHotelPriceSchedule(rawHotel.id),
  ]);

  // Build pricing table from embedded rooms + price schedule
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const checkIn = today;
  const checkOut = tomorrow;
  const nights = 1;
  const pricingTable = buildRoomPricingTable(
    priceSchedule,
    rawHotel.rooms || [],
    checkIn,
    checkOut
  );

  // Resolve image URLs (gs:// → HTTPS)
  const [hotel, relatedHotels] = await Promise.all([
    resolveDocImages(rawHotel),
    resolveDocsImages(rawRelatedHotels),
  ]);

  // JSON-LD Hotel schema cho SEO (v4: dùng rooms embedded + pricingTable)
  const roomOffers = pricingTable
    .filter((r) => r.rateTypes.length > 0)
    .flatMap((r) =>
      r.rateTypes.map((rt) => ({
        "@type": "HotelRoom",
        name: `${r.roomName} — ${rt.rateType.replace(/_/g, " ")}`,
        ...(rt.avgSellPrice > 0 && {
          offers: {
            "@type": "Offer",
            price: Math.round(rt.avgSellPrice),
            priceCurrency: "VND",
          },
        }),
      }))
    );

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
    ...(roomOffers.length > 0 && { containsPlace: roomOffers.slice(0, 10) }),
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
                pricingTable={pricingTable}
                reviews={reviews || []}
                avgRating={avgRating || hotel.rating?.average || 0}
                totalRating={totalRating || hotel.rating?.count || 0}
                relatedHotels={relatedHotels}
                checkIn={checkIn}
                checkOut={checkOut}
                nights={nights}
              />
            </div>

            {/* Booking Sidebar (1/3) — sticky */}
            <aside className="w-full lg:w-[380px] flex-shrink-0">
              <div className="sticky top-24">
                <HotelBookingWidget
                  hotelId={hotel.id}
                  hotelName={hotel.name}
                  pricingTable={pricingTable}
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
                {pricingTable.length > 0
                  ? (() => {
                      const prices = pricingTable.flatMap((r) => r.rateTypes.map((rt) => rt.avgSellPrice)).filter(Boolean);
                      const minPrice = prices.length > 0 ? Math.min(...prices) : hotel.pricing?.basePrice || 0;
                      return minPrice > 0 ? formatCurrency(minPrice, "VND") : "Liên hệ";
                    })()
                  : hotel.pricing?.basePrice > 0
                    ? formatCurrency(hotel.pricing.basePrice, "VND")
                    : "Liên hệ"}
                /đêm
              </p>
            </div>
            <button
              onClick={() => {
                document.querySelector('[data-tab="rooms"]')?.scrollIntoView({ behavior: "smooth" });
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
