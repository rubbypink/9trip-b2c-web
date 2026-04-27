"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import GoogleMap from "@/components/shared/GoogleMap";
import { formatCurrency } from "@/lib/utils";

const HOTEL_TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "rooms", label: "Phòng" },
  { id: "map", label: "Bản đồ" },
  { id: "reviews", label: "Đánh giá" },
  { id: "policies", label: "Chính sách" },
];

/**
 * HotelDetailClient — tab navigation và render nội dung khách sạn.
 * Client component vì cần state cho active tab.
 *
 * @param {{
 *   hotel: object,
 *   rooms: Array<object>,
 *   relatedHotels: Array<object>,
 * }} props
 */
export default function HotelDetailClient({ hotel, rooms = [], relatedHotels = [] }) {
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
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
        {activeTab === "map" && <MapPanel hotel={hotel} />}
        {activeTab === "reviews" && <ReviewsPanel hotel={hotel} />}
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
                className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] relative bg-gray-100">
                  {h.featuredImage ? (
                    <Image src={h.featuredImage} alt={h.name} fill className="object-cover" sizes="33vw" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No image</div>
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
 * OverviewPanel — mô tả, tiện nghi, highlights của khách sạn.
 */
function OverviewPanel({ hotel }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      {hotel.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Giới thiệu</h3>
          <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: hotel.description }} />
        </div>
      )}

      {/* Amenities */}
      {hotel.amenities?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiện nghi</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {hotel.amenities.map((amenity, idx) => (
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

      {/* Highlights */}
      {hotel.highlights?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Điểm nổi bật</h3>
          <ul className="space-y-2">
            {hotel.highlights.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * RoomsPanel — danh sách phòng với giá, sức chứa, CTA đặt phòng.
 */
function RoomsPanel({ rooms, hotel }) {
  const router = useRouter();

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <p>Chưa có thông tin phòng cho khách sạn này.</p>
      </div>
    );
  }

  const handleBookRoom = useCallback(
    (room) => {
      router.push(`/checkout?service=${room.id}&type=room&hotelId=${hotel.id}`);
    },
    [router, hotel.id]
  );

  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <div
          key={room.id}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col sm:flex-row">
            {/* Room Image */}
            <div className="sm:w-72 aspect-[4/3] sm:aspect-auto relative bg-gray-100 flex-shrink-0">
              {room.featuredImage ? (
                <Image src={room.featuredImage} alt={room.name} fill className="object-cover" sizes="288px" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No image</div>
              )}
            </div>

            {/* Room Details */}
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{room.name}</h4>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                  {room.maxAdults > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {room.maxAdults} người lớn
                    </span>
                  )}
                  {room.maxChildren > 0 && (
                    <span>{room.maxChildren} trẻ em</span>
                  )}
                  {room.bedType && <span>{room.bedType}</span>}
                  {room.roomSize && <span>{room.roomSize}m²</span>}
                </div>

                {/* Room amenities preview */}
                {room.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {room.amenities.slice(0, 5).map((a, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {a}
                      </span>
                    ))}
                    {room.amenities.length > 5 && (
                      <span className="text-xs text-gray-400">+{room.amenities.length - 5} nữa</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Price & CTA */}
            <div className="sm:w-48 p-5 flex flex-col items-end justify-center border-t sm:border-t-0 sm:border-l border-gray-100 bg-gray-50/50">
              {room.price > 0 ? (
                <>
                  <p className="text-xs text-gray-500 mb-1">Giá từ</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(room.price, room.currency || "VND")}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">/ đêm</p>
                </>
              ) : (
                <p className="text-sm text-gray-400 mb-3">Liên hệ giá</p>
              )}
              <button
                onClick={() => handleBookRoom(room)}
                className="w-full rounded-lg bg-primary text-white text-sm font-medium px-4 py-2.5 hover:bg-primary-dark transition-colors"
              >
                Đặt phòng
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * MapPanel — Google Map vị trí khách sạn.
 */
function MapPanel({ hotel }) {
  const lat = hotel.map?.lat || hotel.address?.lat;
  const lng = hotel.map?.lng || hotel.address?.lng;

  if (!lat || !lng) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <p>Chưa có thông tin bản đồ cho khách sạn này.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      <GoogleMap
        lat={lat}
        lng={lng}
        zoom={hotel.map?.zoom || 15}
        markers={[{ lat, lng, title: hotel.name }]}
        height="400px"
      />
    </div>
  );
}

/**
 * ReviewsPanel — đánh giá khách sạn.
 */
function ReviewsPanel({ hotel }) {
  const avgRating = hotel.rating?.average || 0;
  const totalRating = hotel.rating?.count || 0;

  if (totalRating === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <p>Chưa có đánh giá nào cho khách sạn này.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`h-4 w-4 ${star <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-1">{totalRating} đánh giá</p>
        </div>
      </div>
    </div>
  );
}

/**
 * PoliciesPanel — chính sách check-in/out, hủy phòng.
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

      {/* Additional policies */}
      {policies.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Lưu ý</h3>
          <div className="prose max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: policies.notes }} />
        </div>
      )}
    </div>
  );
}

// ─── Booking Sidebar ──────────────────────────────────────────────────

/**
 * HotelBookingSidebar — sticky sidebar hiển thị giá và CTA đặt phòng.
 */
function HotelBookingSidebar({ hotel, rooms = [] }) {
  const router = useRouter();
  const minPrice = rooms.length > 0 ? Math.min(...rooms.map((r) => r.price || 0)) : hotel.pricing?.basePrice || 0;
  const currency = hotel.pricing?.currency || "VND";

  const handleBookNow = useCallback(() => {
    router.push(`/checkout?service=${hotel.id}&type=hotel`);
  }, [router, hotel.id]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Price Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="text-sm text-gray-500 mb-1">Giá từ</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(minPrice, currency)}
          </span>
          <span className="text-sm text-gray-500">/ đêm</span>
        </div>
        {hotel.starRating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: hotel.starRating }).map((_, i) => (
              <svg key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-xs text-gray-400 ml-1">Khách sạn {hotel.starRating} sao</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Quick info */}
        {hotel.address?.city && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {hotel.address.city}
          </div>
        )}

        <button
          onClick={handleBookNow}
          className="w-full rounded-lg bg-primary text-white font-semibold px-6 py-3 hover:bg-primary-dark transition-colors"
        >
          Xem phòng trống
        </button>

        <p className="text-xs text-center text-gray-400">Không cần thanh toán ngay</p>
      </div>
    </div>
  );
}

// Attach BookingSidebar as static property
HotelDetailClient.BookingSidebar = HotelBookingSidebar;
