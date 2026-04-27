import Image from "next/image";
import { notFound } from "next/navigation";
import { getDocById, getHotelBySlug, getRoomsByHotel } from "@/lib/firestore";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 3600;

/**
 * generateMetadata — SEO metadata cho trang chi tiết phòng.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { slug, roomId } = resolvedParams;

  const [{ hotel }, room] = await Promise.all([
    getHotelBySlug(slug),
    getDocById("rooms", roomId),
  ]);

  if (!room) return { title: "Phòng không tìm thấy — 9Trip" };

  return {
    title: `${room.name} — ${hotel?.name || "Khách sạn"} — 9Trip`,
    description: room.excerpt || `${room.name} tại ${hotel?.name || ""}. Đặt phòng giá tốt tại 9Trip.`,
    openGraph: {
      title: `${room.name} — ${hotel?.name || "Khách sạn"} — 9Trip`,
      description: room.excerpt || "",
      images: room.featuredImage ? [{ url: room.featuredImage, width: 1200, height: 630 }] : [],
      type: "website",
      locale: "vi_VN",
    },
  };
}

/**
 * Room Detail Page — chi tiết phòng khách sạn.
 * URL: /hotels/[slug]/rooms/[roomId]
 *
 * @param {{ params: Promise<{slug: string, roomId: string}> }} props
 */
export default async function RoomDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug, roomId } = resolvedParams;

  const [{ hotel }, room] = await Promise.all([
    getHotelBySlug(slug),
    getDocById("rooms", roomId),
  ]);

  if (!room) notFound();

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Khách sạn", href: "/hotels" },
          { label: hotel?.name || "Khách sạn", href: hotel ? `/hotels/${slug}` : "#" },
          { label: room.name },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Gallery */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            <div className="aspect-[4/3] md:aspect-[16/10] relative">
              {typeof room.featuredImage === 'string' && room.featuredImage.startsWith('http') ? (
                <Image
                  src={room.featuredImage}
                  alt={room.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100 text-gray-400">
                  Chưa có ảnh
                </div>
              )}
            </div>
            <div className="hidden md:grid grid-cols-2 gap-1">
              {(room.gallery || []).filter(img => typeof img === 'string' && img.startsWith('http')).slice(0, 4).map((img, idx) => (
                <div key={idx} className="aspect-[4/3] relative">
                  <Image src={img} alt={`${room.name} - ${idx + 2}`} fill className="object-cover" sizes="25vw" />
                </div>
              ))}
              {((room.gallery || []).filter(img => typeof img === 'string' && img.startsWith('http')).length === 0) && (
                <div className="col-span-2 flex items-center justify-center bg-gray-100 text-gray-400">
                  Chưa có ảnh bổ sung
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{room.name}</h1>
              {hotel && (
                <p className="text-gray-500 mt-1">
                  Thuộc khách sạn{" "}
                  <a href={`/hotels/${slug}`} className="text-primary hover:underline font-medium">
                    {hotel.name}
                  </a>
                </p>
              )}
            </div>

            {/* Quick Specs */}
            <div className="flex flex-wrap gap-4">
              {room.maxAdults > 0 && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2.5">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Tối đa {room.maxAdults} người lớn</span>
                </div>
              )}
              {room.bedType && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2.5">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">{room.bedType}</span>
                </div>
              )}
              {room.roomSize && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2.5">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">{room.roomSize} m²</span>
                </div>
              )}
            </div>

            {/* Description */}
            {room.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Mô tả phòng</h3>
                <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: room.description }} />
              </div>
            )}

            {/* Amenities */}
            {room.amenities?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiện nghi phòng</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {room.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <aside className="lg:w-96 flex-shrink-0">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Giá từ</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {room.price > 0 ? formatCurrency(room.price, room.currency || "VND") : "Liên hệ"}
                  </span>
                  {room.price > 0 && <span className="text-sm text-gray-500">/ đêm</span>}
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Availability summary */}
                {room.maxAdults > 0 && (
                  <div className="text-sm text-gray-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Sức chứa tối đa</span>
                      <span className="font-medium">{room.maxAdults} người</span>
                    </div>
                    {room.bedType && (
                      <div className="flex justify-between">
                        <span>Loại giường</span>
                        <span className="font-medium">{room.bedType}</span>
                      </div>
                    )}
                  </div>
                )}

                <a
                  href={`/checkout?service=${room.id}&type=room&hotelId=${room.hotelId}`}
                  className="block w-full rounded-lg bg-primary text-white text-center font-semibold px-6 py-3 hover:bg-primary-dark transition-colors"
                >
                  Đặt phòng ngay
                </a>

                <p className="text-xs text-center text-gray-400">Không cần thanh toán ngay</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * generateStaticParams — ISR on-demand.
 */
export async function generateStaticParams() {
  return [];
}
