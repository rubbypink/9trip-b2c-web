import { notFound } from "next/navigation";
import { getTourBySlug, getRelatedTours, getTourReviews, getTourPricing } from "@/lib/firestore-admin";
import { resolveDocImages, resolveDocsImages } from "@/lib/storage-admin";
import Breadcrumb from "@/components/layout/Breadcrumb";
import TourDetailClient from "@/components/tours/TourDetailClient";

export const revalidate = 3600; // ISR: revalidate sau 1h

/**
 * generateMetadata — dynamic metadata cho SEO.
 * Dùng title, excerpt, featuredImage từ tour để tạo meta tags.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { tour } = await getTourBySlug(resolvedParams.slug);

  if (!tour) {
    return { title: "Tour không tìm thấy — 9 Trip" };
  }

  return {
    title: `${tour.title} — 9 Trip`,
    description: tour.excerpt || `Đặt tour ${tour.title} giá tốt nhất tại 9 Trip.`,
    alternates: { canonical: `/tours/${resolvedParams.slug}` },
    openGraph: {
      title: `${tour.title} — 9 Trip`,
      description: tour.excerpt || "",
      images: tour.featuredImage ? [{ url: tour.featuredImage, width: 1200, height: 630 }] : [],
      type: "article",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${tour.title} — 9 Trip`,
      description: tour.excerpt || "",
      images: tour.featuredImage ? [tour.featuredImage] : [],
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

  // Lược bỏ bớt payload gửi xuống Client để tối ưu (Phase 1)
  const clientRelatedTours = relatedTours.map(t => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    featuredImage: t.featuredImage,
    locationName: t.locationName,
    ratingAverage: t.ratingAverage || 0,
    pricing: { adultPrice: t.pricing?.adultPrice || 0 },
    duration: t.duration,
  }));

  const clientReviews = reviews.slice(0, 5); // Pass few newest reviews for summary

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
    <div className="min-h-screen bg-gray-50 pb-16">
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

      <TourDetailClient
        tour={tour}
        pricingTiers={pricingTiers || []}
        relatedTours={clientRelatedTours || []}
        reviews={clientReviews || []}
        avgRating={avgRating || tour.ratingAverage || 0}
        totalRating={totalRating || tour.ratingCount || 0}
      />
    </div>
  );
}