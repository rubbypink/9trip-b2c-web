import Breadcrumb from "@/components/layout/Breadcrumb";
import HotelDetailClient from "./HotelDetailClient";

export const dynamic = "force-dynamic";

/**
 * generateStaticParams — no pre-build, render on-demand.
 */
export async function generateStaticParams() {
  return [];
}

/**
 * generateMetadata — static only (không fetch Firestore trên server).
 */
export async function generateMetadata() {
  return {
    title: "Khách sạn — 9Trip",
    description: "Đặt phòng khách sạn, resort giá tốt nhất tại 9Trip.",
  };
}

/**
 * Hotel Detail Page — Server Component thin shell.
 * Toàn bộ dữ liệu Firestore được fetch ở client-side để tránh lỗi composite index.
 * URL: /hotels/[slug]
 */
export default async function HotelDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Khách sạn", href: "/hotels" },
          { label: "Đang tải..." },
        ]}
      />
      <HotelDetailClient slug={slug} />
    </div>
  );
}
