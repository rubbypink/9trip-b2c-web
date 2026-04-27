import { notFound } from "next/navigation";
import { getHotelBySlug, getRoomsByHotel, getRelatedHotels } from "@/lib/firestore";
import Breadcrumb from "@/components/layout/Breadcrumb";
import HotelHeader from "@/components/hotels/HotelHeader";
import HotelDetailClient from "./HotelDetailClient";

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
 * Hiển thị thông tin khách sạn: gallery, description, rooms, map, reviews, policies + booking sidebar.
 *
 * URL: /hotels/[slug]
 */
export default async function HotelDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Fetch data song song — Vercel best practice: async-parallel
  const { hotel } = await getHotelBySlug(slug);

  if (!hotel) notFound();

  const [rooms, { hotels: relatedHotels }] = await Promise.all([
    getRoomsByHotel(hotel.id),
    getRelatedHotels(slug, hotel.address?.cityId, 3),
  ]);

  // Build reviews summary from hotel.rating
  const avgRating = hotel.rating?.average || 0;
  const totalRating = hotel.rating?.count || 0;

  // JSON-LD Hotel schema cho SEO
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
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <HotelDetailClient
                hotel={hotel}
                rooms={rooms}
                relatedHotels={relatedHotels}
              />
            </div>

            {/* Booking Sidebar — sticky */}
            <aside className="lg:w-96 flex-shrink-0">
              <div className="sticky top-24">
                <HotelDetailClient.BookingSidebar hotel={hotel} rooms={rooms} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
