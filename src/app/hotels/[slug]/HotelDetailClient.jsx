"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import GoogleMap from "@/components/shared/GoogleMap";
import ReviewCard from "@/components/shared/ReviewCard";
import { formatCurrency } from "@/lib/utils";

const HOTEL_TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "rooms", label: "Phòng & Giá" },
  { id: "amenities", label: "Tiện ích" },
  { id: "location", label: "Vị trí" },
  { id: "reviews", label: "Đánh giá" },
  { id: "policies", label: "Chính sách" },
];

/**
 * HotelDetailClient — Tab navigation và render nội dung khách sạn.
 * Hotels v2: 6 tabs mở rộng, room cards redesign, reviews breakdown, amenities grid.
 *
 * @param {{
 *   hotel: object,
 *   rooms: Array<object>,
 *   reviews: Array<object>,
 *   avgRating: number,
 *   totalRating: number,
 *   relatedHotels: Array<object>,
 * }} props
 */
export default function HotelDetailClient({
  hotel,
  rooms = [],
  reviews = [],
  avgRating = 0,
  totalRating = 0,
  relatedHotels = [],
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="space-y-6">
      {/* Product Info Badges */}
      <div className="flex flex-wrap gap-2">
        {hotel.starRating > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-1.5 text-xs font-medium text-yellow-700">
            ⭐ {hotel.starRating} sao
          </span>
        )}
        {hotel.address?.city && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
            📍 {hotel.address.city}
          </span>
        )}
        {avgRating > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700">
            🏆 {avgRating.toFixed(1)} ({totalRating} đánh giá)
          </span>
        )}
        {hotel.pricing?.basePrice > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700">
            💰 Từ {formatCurrency(hotel.pricing.basePrice, hotel.pricing.currency || "VND")}
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto [scrollbar-width:none]">
        {HOTEL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "overview" && <OverviewPanel hotel={hotel} />}
        {activeTab === "rooms" && <RoomsPanel rooms={rooms} hotel={hotel} />}
        {activeTab === "amenities" && <AmenitiesPanel hotel={hotel} />}
        {activeTab === "location" && <LocationPanel hotel={hotel} />}
        {activeTab === "reviews" && (
          <ReviewsPanel
            reviews={reviews}
            avgRating={avgRating}
            totalRating={totalRating}
          />
        )}
        {activeTab === "policies" && <PoliciesPanel hotel={hotel} />}
      </div>

      {/* Related Hotels */}
      {relatedHotels.length > 0 && (
        <div className="pt-10 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-5">Khách sạn tương tự</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedHotels.map((h) => (
              <Link
                key={h.id}
                href={`/hotels/${h.slug}`}
                data-service-type="hotel"
                data-service-id={h.id}
                className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] relative bg-gray-100">
                  {h.featuredImage ? (
                    <Image src={h.featuredImage} alt={h.name} fill className="object-cover" sizes="33vw" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No image</div>
                  )}
                  {/* Score badge */}
                  {h.rating?.average > 0 && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs font-bold text-primary shadow-sm">
                      {h.rating.average.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                    {h.name}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{h.address?.city || ""}</p>
                  {h.pricing?.basePrice && (
                    <p className="mt-2 text-sm font-semibold text-primary">
                      Từ {formatCurrency(h.pricing.basePrice, h.pricing.currency || "VND")}/đêm
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────────

/**
 * OverviewPanel — Mô tả, điểm nổi bật, tiện nghi sơ lược.
 */
function OverviewPanel({ hotel }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {hotel.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Giới thiệu
          </h3>
          <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: hotel.description }} />
        </div>
      )}

      {/* Highlights */}
      {hotel.highlights?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Điểm nổi bật</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hotel.highlights.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amenities Preview */}
      {hotel.amenities?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Tiện nghi</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {hotel.amenities.slice(0, 9).map((amenity, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {amenity}
              </div>
            ))}
            {hotel.amenities.length > 9 && (
              <div className="text-sm text-primary font-medium flex items-center">
                +{hotel.amenities.length - 9} tiện ích khác
              </div>
            )}
          </div>
        </div>
      )}

      {/* Policies Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Giờ nhận / trả phòng</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Nhận phòng</p>
              <p className="font-medium text-gray-900">{hotel.policies?.checkIn || "14:00"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Trả phòng</p>
              <p className="font-medium text-gray-900">{hotel.policies?.checkOut || "12:00"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RoomsPanel — Danh sách phòng với giá, khuyến mãi, pricing tiers, included benefits.
 * Hotels v2: Card redesign với promotion badge, price comparison, pricing tiers table.
 */
function RoomsPanel({ rooms, hotel }) {
  const router = useRouter();

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <svg className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="font-medium text-gray-700">Chưa có thông tin phòng</p>
        <p className="text-sm text-gray-400 mt-1">Khách sạn này chưa cập nhật phòng. Vui lòng quay lại sau.</p>
      </div>
    );
  }

  const handleBookRoom = useCallback(
    (room) => {
      const params = new URLSearchParams({
        service: room.id,
        type: "room",
        hotelId: hotel.id,
      });
      router.push(`/checkout?${params.toString()}`);
    },
    [router, hotel.id]
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 mb-1">{rooms.length} loại phòng cho khách sạn này</p>
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          onBook={() => handleBookRoom(room)}
        />
      ))}
    </div>
  );
}

/**
 * RoomCard — Card hiển thị 1 loại phòng với đầy đủ thông tin.
 * Layout: ảnh trái | info giữa | giá + CTA phải
 * Promotion badge, pricing tiers, included benefits, amenities badges.
 */
function RoomCard({ room, onBook }) {
  const [showDetails, setShowDetails] = useState(false);
  const displayPrice = room.promoPrice || room.price || 0;
  const originalPrice = room.price || 0;
  const hasDiscount = room.promoPrice && room.promoPrice < originalPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - room.promoPrice / originalPrice) * 100)
    : 0;
  const currency = room.currency || "VND";
  const hasPricingTiers = room.pricingTiers?.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Room Image */}
        <div className="sm:w-72 aspect-[4/3] sm:aspect-auto relative bg-gray-100 flex-shrink-0">
          {room.featuredImage ? (
            <Image
              src={room.featuredImage}
              alt={room.name}
              fill
              className="object-cover"
              sizes="288px"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Promotion badge */}
          {room.promoLabel && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide shadow-sm">
              {room.promoLabel}
            </div>
          )}
          {!room.promoLabel && discountPercent > 0 && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide shadow-sm">
              -{discountPercent}%
            </div>
          )}
        </div>

        {/* Room Details */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            {/* Name + Discount */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-lg font-semibold text-gray-900">{room.name}</h4>
            </div>

            {/* Quick Specs */}
            <div className="flex flex-wrap gap-2 mt-2">
              {room.maxAdults > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {room.maxAdults} người lớn{room.maxChildren > 0 ? ` + ${room.maxChildren} trẻ em` : ""}
                </span>
              )}
              {room.bedType && (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100">
                  🛏️ {room.bedType}
                </span>
              )}
              {room.roomSize && (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100">
                  📐 {room.roomSize}m²
                </span>
              )}
            </div>

            {/* Amenities badges */}
            {room.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {room.amenities.slice(0, 4).map((a, idx) => (
                  <span key={idx} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {a}
                  </span>
                ))}
                {room.amenities.length > 4 && (
                  <span className="text-xs text-gray-400">+{room.amenities.length - 4} nữa</span>
                )}
              </div>
            )}

            {/* Included benefits */}
            {room.included?.length > 0 && (
              <div className="mt-3 space-y-1">
                {room.included.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-green-700">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            )}

            {/* Pricing Tiers */}
            {hasPricingTiers && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-3 text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                {showDetails ? "Thu gọn" : "Xem chi tiết giá"}
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}

            {/* Collapsible Pricing Tiers Table */}
            {hasPricingTiers && showDetails && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Gói giá</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Người lớn</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Trẻ em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {room.pricingTiers.map((tier) => (
                      <tr key={tier.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {tier.name}
                          {tier.promoLabel && (
                            <span className="ml-1 text-red-500 font-semibold">{tier.promoLabel}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-blue-600">
                          {tier.promoPrice > 0 ? (
                            <>
                              <span className="line-through text-gray-400 mr-1">
                                {formatCurrency(tier.adultPrice, tier.currency || currency)}
                              </span>
                              {formatCurrency(tier.promoPrice, tier.currency || currency)}
                            </>
                          ) : (
                            formatCurrency(tier.adultPrice, tier.currency || currency)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {tier.childPrice != null
                            ? formatCurrency(tier.childPrice, tier.currency || currency)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Price & CTA */}
        <div className="sm:w-52 p-5 flex flex-col items-end justify-center border-t sm:border-t-0 sm:border-l border-gray-100 bg-gray-50/50">
          {displayPrice > 0 ? (
            <>
              <p className="text-xs text-gray-500 mb-1">Giá từ</p>
              <div className="text-right">
                {hasDiscount && (
                  <p className="text-xs text-gray-400 line-through">
                    {formatCurrency(originalPrice, currency)}
                  </p>
                )}
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(displayPrice, currency)}
                </p>
              </div>
              <p className="text-xs text-gray-400 mb-3">/ đêm</p>
              {hasDiscount && (
                <p className="text-xs font-medium text-red-500 mb-2">Tiết kiệm {formatCurrency(originalPrice - displayPrice, currency)}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 mb-3">Liên hệ giá</p>
          )}
          <button
            onClick={onBook}
            className="w-full rounded-lg bg-primary text-white text-sm font-semibold px-4 py-2.5 hover:bg-primary-dark transition-colors"
          >
            Đặt ngay
          </button>
          <p className="text-[10px] text-gray-400 mt-1.5">🔄 Miễn phí hủy</p>
        </div>
      </div>
    </div>
  );
}

/**
 * AmenitiesPanel — Danh sách tiện nghi khách sạn dạng grid với icons.
 */
function AmenitiesPanel({ hotel }) {
  const amenities = hotel.amenities || [];

  if (amenities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <p>Chưa có thông tin tiện nghi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiện nghi & Dịch vụ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {amenities.map((amenity, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">{amenity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * LocationPanel — Bản đồ vị trí khách sạn + thông tin địa chỉ.
 */
function LocationPanel({ hotel }) {
  const lat = hotel.map?.lat || hotel.address?.lat;
  const lng = hotel.map?.lng || hotel.address?.lng;
  const address = hotel.address || {};

  if (!lat || !lng) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <p>Chưa có thông tin bản đồ cho khách sạn này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Địa chỉ</h3>
        <p className="text-sm text-gray-600">
          {[address.street, address.city, address.country].filter(Boolean).join(", ")}
        </p>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <GoogleMap
          lat={lat}
          lng={lng}
          zoom={hotel.map?.zoom || 15}
          markers={[{ lat, lng, title: hotel.name }]}
          height="400px"
        />
      </div>
    </div>
  );
}

/**
 * ReviewsPanel — Đánh giá với rating breakdown + individual reviews.
 * Hotels v2: Thêm rating bar breakdown, ReviewCard component, review tags.
 */
function ReviewsPanel({ reviews = [], avgRating = 0, totalRating = 0 }) {
  // Tính rating distribution
  const distribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.round(r.rating || 0);
      if (star >= 1 && star <= 5) dist[star]++;
    });
    return dist;
  }, [reviews]);

  const getScoreLabel = (score) => {
    if (score >= 9) return "Tuyệt vời";
    if (score >= 8) return "Rất tốt";
    if (score >= 7) return "Tốt";
    if (score >= 6) return "Khá";
    return "Trung bình";
  };

  if (totalRating === 0 && reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <svg className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <p className="font-medium text-gray-700">Chưa có đánh giá nào</p>
        <p className="text-sm text-gray-400 mt-1">Hãy là người đầu tiên đánh giá khách sạn này.</p>
      </div>
    );
  }

  const displayAvg = avgRating || 0;

  return (
    <div className="space-y-6">
      {/* Score Summary + Rating Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Score Summary */}
          <div className="flex flex-col items-center sm:w-40">
            <div className="text-5xl font-bold text-primary">{displayAvg.toFixed(1)}</div>
            <div className="flex items-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-4 w-4 ${star <= Math.round(displayAvg) ? "text-yellow-400" : "text-gray-200"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm font-medium text-gray-700 mt-1">{getScoreLabel(displayAvg)}</p>
            <p className="text-xs text-gray-400 mt-1">{totalRating || reviews.length} đánh giá</p>
          </div>

          {/* Rating Bars */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-gray-600 text-right">{star} sao</span>
                  <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-gray-400 text-xs">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Individual Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Đánh giá gần đây</h3>
          {reviews.map((review, idx) => (
            <ReviewCard key={review.id || idx} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * PoliciesPanel — Chính sách khách sạn: nhận/trả phòng, hủy, trẻ em, thú cưng, thuế phí.
 */
function PoliciesPanel({ hotel }) {
  const policies = hotel.policies || {};

  return (
    <div className="space-y-4">
      {/* Check-in / Check-out */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Giờ nhận / trả phòng</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Nhận phòng</p>
              <p className="font-medium text-gray-900">{policies.checkIn || "14:00"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Trả phòng</p>
              <p className="font-medium text-gray-900">{policies.checkOut || "12:00"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Chính sách hủy phòng</h3>
        {policies.cancellation ? (
          <div className="prose max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: policies.cancellation }} />
        ) : (
          <p className="text-sm text-gray-500">Vui lòng liên hệ để biết chính sách hủy phòng chi tiết.</p>
        )}
      </div>

      {/* Children Policy */}
      {policies.children && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Chính sách trẻ em
          </h3>
          <div className="prose max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: policies.children }} />
        </div>
      )}

      {/* Pet Policy */}
      {policies.pets && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            Chính sách thú cưng
          </h3>
          <div className="prose max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: policies.pets }} />
        </div>
      )}

      {/* Taxes & Fees */}
      {policies.taxes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" />
            </svg>
            Thuế & Phí
          </h3>
          <div className="prose max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: policies.taxes }} />
        </div>
      )}

      {/* Additional notes */}
      {policies.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Lưu ý</h3>
          <div className="prose max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: policies.notes }} />
        </div>
      )}
    </div>
  );
}
