import { notFound } from "next/navigation";
import { getActivityBySlug, getReviews, getRelatedActivities } from "@/lib/firestore-admin";
import { resolveDocImages } from "@/lib/storage-admin";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ActivityDetailClient from "@/components/activities/ActivityDetailClient";

export const revalidate = 3600;

/**
 * generateMetadata — SEO cho activity.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { activity } = await getActivityBySlug(resolvedParams.slug);

  if (!activity) return { title: "Hoạt động không tìm thấy — 9 Trip" };

  return {
    title: `${activity.title} — 9 Trip`,
    description: activity.excerpt || `${activity.title} — đặt tour trải nghiệm giá tốt tại 9 Trip.`,
    alternates: { canonical: `/activities/${resolvedParams.slug}` },
    openGraph: {
      title: `${activity.title} — 9 Trip`,
      description: activity.excerpt || "",
      images: activity.featuredImage ? [{ url: activity.featuredImage, width: 1200, height: 630 }] : [],
      type: "article",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${activity.title} — 9 Trip`,
      description: activity.excerpt || "",
      images: activity.featuredImage ? [activity.featuredImage] : [],
    },
  };
}

/**
 * generateStaticParams — ISR on-demand.
 */
export async function generateStaticParams() {
  return [];
}

/**
 * Activity Detail Page — Server Component (ISR).
 * URL: /activities/[slug]
 */
export default async function ActivityDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const { activity: rawActivity } = await getActivityBySlug(slug);

  if (!rawActivity) notFound();

  // Resolve image URLs (gs:// → HTTPS)
  const activity = await resolveDocImages(rawActivity);

  // Fetch reviews and related activities in parallel
  const [{ reviews }, { activities: relatedActivities }] = await Promise.all([
    getReviews("activity", activity.id),
    getRelatedActivities(slug, 3),
  ]);

  const totalRating = reviews.length;
  const avgRating =
    totalRating > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating
      : 0;

  // Lược bỏ bớt payload gửi xuống Client để tối ưu (Phase 1)
  const clientRelatedActivities = relatedActivities.map(a => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    featuredImage: a.featuredImage,
    locationName: a.locationName,
    ratingAverage: a.ratingAverage || 0,
    pricing: { basePrice: a.pricing?.basePrice || 0 },
    duration: a.duration,
  }));

  const clientReviews = reviews.slice(0, 5); // Pass few newest reviews for summary

  // Lấy danh sách pricing tiers từ document
  const pricingTiers = activity.pricing?.tiers || [];

  // JSON-LD schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: activity.title,
    description: activity.excerpt || activity.description?.replace(/<[^>]*>/g, "").slice(0, 200),
    image: activity.featuredImage,
    url: `/activities/${slug}`,
    ...(activity.locationName && {
      touristDestination: {
        "@type": "City",
        name: activity.locationName,
      },
    }),
    ...((activity.pricing?.basePrice || pricingTiers[0]?.adultPrice) && {
      offers: {
        "@type": "Offer",
        price: activity.pricing?.basePrice || pricingTiers[0]?.adultPrice,
        priceCurrency: activity.pricing?.currency || pricingTiers[0]?.currency || "VND",
        availability: "https://schema.org/InStock",
      },
    }),
    ...(avgRating > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount: totalRating,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-muted pb-16">
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Hoạt động", href: "/activities" },
            { label: activity.title },
          ]}
        />

        <ActivityDetailClient
          activity={activity}
          pricingTiers={pricingTiers}
          relatedActivities={clientRelatedActivities}
          reviews={clientReviews}
          avgRating={avgRating}
          totalRating={totalRating}
        />
      </div>
    </>
  );
}
