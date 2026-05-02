import { cache } from "react";
import Breadcrumb from "@/components/layout/Breadcrumb";
import HotelDetailClient from "./HotelDetailClient";
import {
  getHotelBySlug,
  getHotelPriceSchedule,
  getHotelReviews,
  getRelatedHotels,
} from "@/lib/firestore";
import { resolveDocImages, resolveDocsImages } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * generateStaticParams — no pre-build, render on-demand.
 */
export async function generateStaticParams() {
  return [];
}

/** Cache per-request to avoid duplicate Firestore reads. */
const cachedGetHotelBySlug = cache(getHotelBySlug);
const cachedGetHotelPriceSchedule = cache(getHotelPriceSchedule);
const cachedGetHotelReviews = cache(getHotelReviews);
const cachedGetRelatedHotels = cache(getRelatedHotels);

/**
 * generateMetadata — dynamic metadata from Firestore.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const { hotel } = await cachedGetHotelBySlug(slug);
  if (!hotel) return { title: "Khách sạn không tìm thấy — 9Trip" };
  return {
    title: `${hotel.name} — 9Trip`,
    description: hotel.excerpt || `Đặt phòng tại ${hotel.name} với giá tốt nhất.`,
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
 * Hotel Detail Page — Server Component.
 * Fetches all data on the server, passes serialized props to the Client Component
 * for interactivity (tabs, date picker, cart sync).
 * URL: /hotels/[slug]
 */
export default async function HotelDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // 1. Fetch hotel (needed for subsequent queries)
  const { hotel: rawHotel } = await cachedGetHotelBySlug(slug);

  if (!rawHotel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Khách sạn", href: "/hotels" },
            { label: "Không tìm thấy" },
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Khách sạn không tồn tại</h1>
          <p className="text-gray-500">Vui lòng kiểm tra lại đường dẫn hoặc quay về trang danh sách.</p>
        </div>
      </div>
    );
  }

  // 2. Fetch price, reviews, related in parallel
  const cityId = rawHotel.address?.cityId;
  const [priceSchedule, reviewResult, { hotels: rawRelated }] = await Promise.all([
    cachedGetHotelPriceSchedule(rawHotel.id),
    cachedGetHotelReviews(slug),
    cachedGetRelatedHotels(slug, cityId, 3),
  ]);

  const { reviews, totalRating, avgRating } = reviewResult;

  // 3. Resolve images in parallel
  const [hotel, relatedHotels] = await Promise.all([
    resolveDocImages(rawHotel),
    resolveDocsImages(rawRelated),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Khách sạn", href: "/hotels" },
          { label: hotel.name },
        ]}
      />
      <HotelDetailClient
        slug={slug}
        hotel={hotel}
        priceSchedule={priceSchedule}
        reviews={reviews}
        avgRating={avgRating}
        totalRating={totalRating}
        relatedHotels={relatedHotels}
      />
    </div>
  );
}
