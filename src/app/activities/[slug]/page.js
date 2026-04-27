import { notFound } from "next/navigation";
import { getDocBySlug, getReviews } from "@/lib/firestore";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ActivityDetailClient from "./ActivityDetailClient";

export const revalidate = 3600;

/**
 * generateMetadata — SEO cho activity.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { activity } = await getDocBySlug("activities", resolvedParams.slug);

  if (!activity) return { title: "Hoạt động không tìm thấy — 9Trip" };

  return {
    title: `${activity.title} — 9Trip`,
    description: activity.excerpt || `${activity.title} — đặt tour trải nghiệm giá tốt tại 9Trip.`,
    openGraph: {
      title: `${activity.title} — 9Trip`,
      description: activity.excerpt || "",
      images: activity.featuredImage ? [{ url: activity.featuredImage, width: 1200, height: 630 }] : [],
      type: "article",
      locale: "vi_VN",
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

  const [{ activity }] = await Promise.all([
    getDocBySlug("activities", slug),
  ]);

  if (!activity) notFound();

  // Fetch reviews
  const { reviews } = await getReviews("activity", activity.id);
  const totalRating = reviews.length;
  const avgRating =
    totalRating > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRating
      : 0;

  // JSON-LD TouristAttraction schema
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
    ...(activity.pricing?.basePrice && {
      offers: {
        "@type": "Offer",
        price: activity.pricing.basePrice,
        priceCurrency: activity.pricing.currency || "VND",
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
      <div className="min-h-screen bg-gray-50 pb-16">
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Hoạt động", href: "/activities" },
            { label: activity.title },
          ]}
        />

        <ActivityDetailClient
          activity={activity}
          reviews={reviews}
          avgRating={avgRating}
          totalRating={totalRating}
        />
      </div>
    </>
  );
}
