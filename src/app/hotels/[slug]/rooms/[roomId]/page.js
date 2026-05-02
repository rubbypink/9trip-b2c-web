import Image from "next/image";
import { notFound } from "next/navigation";
import { getHotelBySlug, getHotelPriceSchedule, resolveRoomPricing } from "@/lib/firestore";
import { resolveDocImages } from "@/lib/storage";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ImageCarousel from "@/components/shared/ImageCarousel";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 3600;

/**
 * Find a room by ID from a hotel's embedded rooms (Map or array).
 * @param {Object} hotel
 * @param {string} roomId
 * @returns {Object|null}
 */
function findRoomInHotel(hotel, roomId) {
  if (!hotel?.rooms) return null;

  // Embedded Map (key = roomId, e.g. "room_deluxe-ocean-view": { ... })
  if (typeof hotel.rooms === "object" && !Array.isArray(hotel.rooms)) {
    return hotel.rooms[roomId] || null;
  }

  // Embedded array
  if (Array.isArray(hotel.rooms)) {
    return hotel.rooms.find((r) => r.id === roomId || r.slug === roomId) || null;
  }

  return null;
}

/**
 * generateMetadata — SEO metadata cho trang chi tiết phòng.
 */
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { slug, roomId } = resolvedParams;

  const { hotel } = await getHotelBySlug(slug);
  const room = hotel ? findRoomInHotel(hotel, roomId) : null;

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
 * Room Detail Page — chi tiết phòng khách sạn với pricing tiers và gallery carousel.
 * URL: /hotels/[slug]/rooms/[roomId]
 *
 * @param {{ params: Promise<{slug: string, roomId: string}> }} props
 */
export default async function RoomDetailPage({ params }) {
  const resolvedParams = await params;
  const { slug, roomId } = resolvedParams;

  const { hotel } = await getHotelBySlug(slug);
  const rawRoom = hotel ? findRoomInHotel(hotel, roomId) : null;

  if (!rawRoom) notFound();

  // Resolve room images (featuredImage + gallery in room, handled by resolveDocImages)
  const room = await resolveDocImages(rawRoom);

  // v4: Fetch pricing from hotel_price_schedules
  const priceSchedule = await getHotelPriceSchedule(hotel.id);
  const today = new Date().toISOString().split("T")[0];
  const pricingEntries = priceSchedule
    ? resolveRoomPricing(priceSchedule, rawRoom.id, today)
    : [];

  const pricingTiers = pricingEntries.map((entry) => ({
    id: entry.periodKey,
    rateType: entry.rateType,
    name: entry.rateType,
    sellPrice: entry.sellPrice,
    costPrice: entry.costPrice,
    supplier: entry.supplier,
    startDate: entry.startDate,
    endDate: entry.endDate,
  }));

  const lowestSchedulePrice = pricingEntries.length > 0
    ? pricingEntries[0].sellPrice
    : 0;
  const displayPrice = lowestSchedulePrice || hotel?.pricing?.basePrice || 0;

  const allImages = room.featuredImage
    ? [room.featuredImage, ...(room.gallery || [])]
    : (room.gallery || []);
  const currency = "VND";

  // JSON-LD schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name: room.name,
    description: room.description?.replace(/<[^>]*>/g, "").slice(0, 200) || "",
    image: room.featuredImage,
    url: `/hotels/${slug}/rooms/${roomId}`,
    ...(displayPrice > 0 && {
      offers: {
        "@type": "Offer",
        price: displayPrice,
        priceCurrency: currency,
        availability: "https://schema.org/InStock",
      },
    }),
    ...(hotel?.name && {
      containedInPlace: {
        "@type": "Hotel",
        name: hotel.name,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Khách sạn", href: "/hotels" },
          { label: hotel?.name || "Khách sạn", href: hotel ? `/hotels/${slug}` : "#" },
          { label: room.name },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Gallery Carousel */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          <ImageCarousel
            images={allImages}
            alt={room.name}
            aspectRatio="aspect-[4/3] md:aspect-[21/9]"
            showOverlay={true}
            serviceId={room.id}
            serviceType="room"
          />
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

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {room.maxAdults > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                  👤 {room.maxAdults} người lớn{room.maxChildren > 0 ? ` + ${room.maxChildren} trẻ em` : ""}
                </span>
              )}
              {room.bedType && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                  🛏️ {room.bedType}
                </span>
              )}
              {room.roomSize && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                  📐 {room.roomSize}m²
                </span>
              )}
            </div>

            {/* Description */}
            {room.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Mô tả phòng</h3>
                <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: room.description }} />
              </div>
            )}

            {/* Included Benefits */}
            {room.included?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Lợi ích bao gồm</h3>
                <div className="space-y-2">
                  {room.included.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Tiers */}
            {pricingTiers.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Bảng giá ({today})</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-900">Gói giá</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-900">Giá bán</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-900">Nhà cung cấp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pricingTiers.map((tier) => (
                        <tr key={tier.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{tier.name}</td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">
                            {tier.sellPrice > 0 ? formatCurrency(tier.sellPrice, currency) : "Liên hệ"}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">{tier.supplier || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                  {displayPrice > 0 ? (
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(displayPrice, currency)}
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-gray-900">Liên hệ</span>
                  )}
                  <span className="text-sm text-gray-500">/ đêm</span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Quick specs */}
                <div className="text-sm text-gray-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Sức chứa tối đa</span>
                    <span className="font-medium">{room.maxAdults || "—"} người</span>
                  </div>
                  {room.bedType && (
                    <div className="flex justify-between">
                      <span>Loại giường</span>
                      <span className="font-medium">{room.bedType}</span>
                    </div>
                  )}
                  {room.roomSize && (
                    <div className="flex justify-between">
                      <span>Diện tích</span>
                      <span className="font-medium">{room.roomSize}m²</span>
                    </div>
                  )}
                </div>

                <a
                  href={`/checkout?service=${room.id}&type=room&hotelId=${hotel?.id || ""}`}
                  className="block w-full rounded-xl bg-primary text-white text-center font-semibold px-6 py-3.5 hover:bg-primary-dark transition-colors shadow-sm"
                >
                  Đặt phòng ngay
                </a>

                <p className="text-xs text-center text-gray-400">🔄 Miễn phí hủy &bull; Thanh toán an toàn</p>
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
