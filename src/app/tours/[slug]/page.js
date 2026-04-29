import Image from "next/image";
import { notFound } from "next/navigation";
import { getTourBySlug, getRelatedTours, getTourReviews, getTourPricing } from "@/lib/firestore";
import { resolveDocImages, resolveDocsImages } from "@/lib/storage";
import Breadcrumb from "@/components/layout/Breadcrumb";
import TourHeader from "@/components/tours/TourDetail/TourHeader";
import TourBookingWidget from "@/components/tours/TourBookingWidget";
import TourDetailClient from "./TourDetailClient";

export const revalidate = 3600; // ISR: revalidate sau 1h

/**
 * generateMetadata — dynamic metadata cho SEO.
 * Dùng title, excerpt, featuredImage từ tour để tạo meta tags.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { tour } = await getTourBySlug(resolvedParams.slug);

  if (!tour) {
    return { title: "Tour không tìm thấy — 9Trip" };
  }

  return {
    title: `${tour.title} — 9Trip`,
    description: tour.excerpt || `Đặt tour ${tour.title} giá tốt nhất tại 9Trip.`,
    openGraph: {
      title: `${tour.title} — 9Trip`,
      description: tour.excerpt || "",
      images: tour.featuredImage ? [{ url: tour.featuredImage, width: 1200, height: 630 }] : [],
      type: "article",
      locale: "vi_VN",
    },
  };
}

/**
 * generateStaticParams — pre-build các tour phổ biến (tối ưu ISR).
 * Trong thực tế có thể fetch danh sách slug từ Firestore.
 */
export async function generateStaticParams() {
  // Trả về mảng rỗng — tất cả route sẽ được render on-demand + cache bởi ISR
  return [];
}

/**
 * Tour Detail Page — Server Component (ISR).
 * Hiển thị đầy đủ thông tin tour: gallery, mô tả, lịch trình, bản đồ, đánh giá, FAQ + Booking sidebar.
 *
 * URL: /tours/[slug]
 */
export default async function TourDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Fetch tour trước (cần rawTour.id cho getTourPricing)
  const { tour: rawTour } = await getTourBySlug(slug);
  if (!rawTour) {
    notFound();
  }

  // Fetch các data còn lại song song — with fallback on individual failures
  let rawRelatedTours = [];
  let reviews = [], totalRating = 0, avgRating = 0;
  let pricingTiers = [];

  try {
    const [relatedResult, reviewResult, tiers] = await Promise.all([
      getRelatedTours(slug),
      getTourReviews(slug),
      getTourPricing(rawTour.id),
    ]);
    rawRelatedTours = relatedResult?.tours || [];
    reviews = reviewResult?.reviews || [];
    totalRating = reviewResult?.totalRating || 0;
    avgRating = reviewResult?.avgRating || 0;
    pricingTiers = tiers || [];
  } catch (error) {
    console.error('[TourDetailPage] Error fetching parallel data:', error.message);
    // All fallbacks already set to empty/default above
  }

  // Resolve image URLs (gs:// → HTTPS) — with fallback
  let tour = rawTour;
  let relatedTours = [];
  try {
    [tour, relatedTours] = await Promise.all([
      resolveDocImages(rawTour),
      resolveDocsImages(rawRelatedTours),
    ]);
  } catch (error) {
    console.error('[TourDetailPage] Error resolving images:', error.message);
    // tour stays as rawTour, relatedTours stays empty
  }

  // JSON-LD structured data for SEO (TouristTrip schema)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.title,
    description: tour.excerpt || tour.description?.replace(/<[^>]*>/g, "").slice(0, 200),
    image: tour.featuredImage,
    url: `/tours/${slug}`,
    ...(tour.locationName && {
      touristDestination: {
        "@type": "City",
        name: tour.locationName,
      },
    }),
    ...((tour.pricing?.adultPrice || pricingTiers[0]?.adultPrice) && {
      offers: {
        "@type": "Offer",
        price: tour.pricing?.adultPrice || pricingTiers[0]?.adultPrice,
        priceCurrency: tour.pricing?.currency || pricingTiers[0]?.currency || "VND",
        availability: "https://schema.org/InStock",
      },
    }),
    ...(tour.ratingAverage && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: tour.ratingAverage,
        reviewCount: tour.ratingCount || 0,
      },
    }),
    ...(tour.duration?.days && {
      itinerary: {
        "@type": "Trip",
        duration: `P${tour.duration.days}D`,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-white">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Tours", href: "/tours" },
          { label: tour.title, href: `/tours/${slug}` },
        ]}
      />

      {/* Tour Header (Gallery, Title, Rating, Location, Duration) */}
      <TourHeader tour={tour} />

      {/* Main Layout: Content + Sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content (2/3) */}
          <div className="flex-1 min-w-0">
            <TourDetailClient
              tour={tour}
              pricingTiers={pricingTiers || []}
              relatedTours={relatedTours || []}
              reviews={reviews || []}
              avgRating={avgRating || tour.ratingAverage || 0}
              totalRating={totalRating || tour.ratingCount || 0}
            />
          </div>

          {/* Sidebar Booking Form (1/3) */}
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <TourBookingWidget
              pricingTiers={pricingTiers || []}
              tourTitle={tour.title}
              tourId={tour.id}
              basePrice={tour.pricing?.adultPrice || 0}
              baseChildPrice={tour.pricing?.childPrice || 0}
              baseInfantPrice={tour.pricing?.infantPrice || 0}
              currency={tour.pricing?.currency || "VND"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}