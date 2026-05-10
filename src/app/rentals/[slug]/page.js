import Image from "next/image";
import { notFound } from "next/navigation";
import { getDocBySlug } from "@/lib/firestore-admin";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { formatCurrency } from "@/lib/utils";

/**
 * generateMetadata — SEO cho rental detail.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const rentalDoc = await getDocBySlug("rentals", resolvedParams.slug);

  if (!rentalDoc) return { title: "Dịch vụ không tìm thấy — 9 Trip" };

  const title = rentalDoc.title || rentalDoc.name || "Dịch vụ cho thuê";
  return {
    title: `${title} — 9 Trip`,
    description: rentalDoc.excerpt || `${title} — giá tốt tại 9 Trip.`,
    alternates: { canonical: `/rentals/${resolvedParams.slug}` },
    openGraph: {
      title: `${title} — 9 Trip`,
      description: rentalDoc.excerpt || "",
      images: rentalDoc.featuredImage ? [{ url: rentalDoc.featuredImage, width: 1200, height: 630 }] : [],
      type: "website",
      locale: "vi_VN",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — 9 Trip`,
      description: rentalDoc.excerpt || "",
      images: rentalDoc.featuredImage ? [rentalDoc.featuredImage] : [],
    },
  };
}

export async function generateStaticParams() {
  return [];
}

/**
 * Rental Detail Page — Server Component (ISR).
 * URL: /rentals/[slug]
 */
export default async function RentalDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const rentalDoc = await getDocBySlug("rentals", slug);

  if (!rentalDoc) notFound();

  const {
    id,
    title,
    name,
    featuredImage,
    gallery = [],
    description,
    excerpt,
    pricing = {},
    rentalType,
    location,
    features = [],
    pickupInfo,
  } = rentalDoc;

  const displayName = title || name || "Dịch vụ";
  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;
  const price = pricing?.basePrice || pricing?.dailyPrice || 0;
  const currency = pricing?.currency || "VND";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    description: excerpt || description?.replace(/<[^>]*>/g, "").slice(0, 200) || "",
    image: featuredImage,
    url: `/rentals/${slug}`,
    ...(price > 0 && {
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: currency,
        availability: "https://schema.org/InStock",
      },
    }),
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Dịch vụ cho thuê", href: "/rentals" },
          { label: displayName },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Gallery */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                <div className="aspect-[4/3] relative">
                  {allImages[0] ? (
                    <Image src={allImages[0]} alt={displayName} fill className="object-cover" priority sizes="50vw" />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">Chưa có ảnh</div>
                  )}
                </div>
                <div className="hidden md:grid grid-cols-2 gap-1">
                  {allImages.slice(1, 5).map((img, idx) => (
                    <div key={idx} className="aspect-[4/3] relative">
                      <Image src={img} alt={`${displayName} - ${idx + 2}`} fill className="object-cover" sizes="25vw" />
                    </div>
                  ))}
                  {allImages.length <= 1 && (
                    <div className="col-span-2 flex items-center justify-center bg-muted text-muted-foreground">Chưa có ảnh bổ sung</div>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{displayName}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                {rentalType && <span className="bg-surface-1 px-2.5 py-1 rounded-full">{rentalType}</span>}
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {location}
                  </span>
                )}
              </div>
              {excerpt && <p className="text-muted-foreground mt-3">{excerpt}</p>}
            </div>

            {/* Description */}
            {description && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Mô tả</h3>
                <div className="prose max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: description }} />
              </div>
            )}

            {/* Features */}
            {features.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Bao gồm</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {features.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pickup Info */}
            {pickupInfo && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Thông tin nhận hàng</h3>
                <p className="text-sm text-foreground">{pickupInfo}</p>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <aside className="lg:w-96 flex-shrink-0">
            <div className="sticky top-24 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <div className="text-sm text-muted-foreground mb-1">Giá thuê từ</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {price > 0 ? formatCurrency(price, currency) : "Liên hệ"}
                  </span>
                  {price > 0 && <span className="text-sm text-muted-foreground">/ ngày</span>}
                </div>
              </div>

              <div className="p-5 space-y-4">
                <a
                  href={`/checkout?service=${id}&type=rental`}
                  className="block w-full rounded-lg bg-primary text-white text-center font-semibold px-6 py-3 hover:bg-primary-dark transition-colors"
                >
                  Đặt ngay
                </a>

                <p className="text-xs text-center text-muted-foreground">Xác nhận tức thì</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
