"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { buildRoomPricingTable } from "@/lib/firestore";
import Badge from "@/components/shared/Badge";
import OverviewPanel from "@/components/hotels/HotelDetail/OverviewPanel";
import RoomsPanel from "@/components/hotels/HotelDetail/RoomsPanel";

const GoogleMap = dynamic(() => import("@/components/shared/GoogleMap"), { ssr: false });
const AmenitiesPanel = dynamic(() => import("@/components/hotels/HotelDetail/AmenitiesPanel"));
const PoliciesPanel = dynamic(() => import("@/components/hotels/HotelDetail/PoliciesPanel"));
const LocationPanel = dynamic(() => import("@/components/hotels/HotelDetail/LocationPanel"));

import HotelHeader, {
  ReviewSummaryCompact,
} from "@/components/hotels/HotelHeader";
import HotelBookingWidget from "@/components/hotels/HotelBookingWidget";

const ReviewsPanel = dynamic(() => import("@/components/hotels/HotelDetail/ReviewsPanel"));
const WriteReviewForm = dynamic(() => import("@/components/reviews/WriteReviewForm"));

const HOTEL_TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "rooms", label: "Phòng & Giá" },
  { id: "amenities", label: "Tiện ích" },
  { id: "reviews", label: "Đánh giá" },
  { id: "policies", label: "Chính sách" },
  { id: "location", label: "Vị trí" },
];

/**
 * HotelDetailClient — Client component for interactivity (tabs, date picker, cart).
 * Receives all data pre-fetched from the Server Component (page.js).
 *
 * @param {{
 *   slug: string,
 *   hotel: Object,
 *   priceSchedule: Object|null,
 *   reviews: Array<Object>,
 *   avgRating: number,
 *   totalRating: number,
 *   relatedHotels: Array<Object>,
 * }} props
 */
export default function HotelDetailClient({
  slug,
  hotel,
  priceSchedule,
  reviews,
  avgRating,
  totalRating,
  relatedHotels,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  // ── Date state (reactive pricing) ────────────────────────
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().split("T")[0]);
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  const nights = useMemo(() => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    return Math.max(1, Math.round((co - ci) / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  // ── Reactive pricing table (auto-recompute on date change) ─
  const pricingTable = useMemo(() => {
    if (!hotel || !priceSchedule) return [];
    const roomsMap = hotel.rooms || [];
    // Đảm bảo mỗi room đều có ID nếu rooms được lưu dạng Map
    const rooms = (Array.isArray(roomsMap) ? roomsMap : Object.entries(roomsMap).map(([id, r]) => ({ ...r, id: r.id || id }))).filter(r => r.isActive);
    if (rooms.length === 0) return [];
    return buildRoomPricingTable(priceSchedule, rooms, checkIn, checkOut);
  }, [priceSchedule, hotel?.rooms, checkIn, checkOut]);

  // ── Lowest price with safe fallback ──────────────────────
  const lowestPrice = useMemo(() => {
    if (!pricingTable || pricingTable.length === 0) {
      return hotel?.pricing?.basePrice || 0;
    }
    const prices = pricingTable
      .flatMap((r) => r.rateTypes.map((rt) => rt.avgSellPrice))
      .filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : (hotel?.pricing?.basePrice || 0);
  }, [pricingTable, hotel]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  /**
   * Handle date changes — update checkIn/checkOut, pricing auto-recomputes via useMemo.
   */
  const handleDateChange = useCallback((newCheckIn, newCheckOut) => {
    if (newCheckIn) setCheckIn(newCheckIn);
    if (newCheckOut) setCheckOut(newCheckOut);
  }, []);

  const handleBookNow = useCallback(() => {
    setActiveTab("rooms");
    setTimeout(() => {
      const roomsSection = document.querySelector('[data-section="rooms"]');
      if (roomsSection) {
        roomsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const tabNav = document.querySelector('[data-tab-nav]');
        if (tabNav) {
          tabNav.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 100);
  }, []);

  // ── Render ──────────────────────────────────────────────
  const hasMap = hotel.map?.lat && hotel.map?.lng;

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Hotel",
            name: hotel.name,
            description: hotel.excerpt || "",
            image: hotel.featuredImage,
            url: `/hotels/${slug}`,
            ...(hotel.starRating && { starRating: { "@type": "Rating", ratingValue: hotel.starRating } }),
            ...(avgRating > 0 && {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: avgRating,
                reviewCount: totalRating,
              },
            }),
          })
        }}
      />

      <HotelHeader
        hotel={hotel}
        avgRating={avgRating}
        totalRating={totalRating}
        onBookNow={handleBookNow}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content (2/3) */}
          <div className="flex-1 min-w-0">
            {/* Info Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {hotel.starRating > 0 && (
                <Badge variant="warning">⭐ {hotel.starRating} sao</Badge>
              )}
              {hotel.address?.city && (
                <Badge variant="default">📍 {hotel.address.city}</Badge>
              )}
              {avgRating > 0 && (
                <Badge variant="info">🏆 {avgRating.toFixed(1)} ({totalRating} đánh giá)</Badge>
              )}
              {lowestPrice > 0 && (
                <Badge variant="success">💰 Từ {formatCurrency(lowestPrice, "VND")}/đêm</Badge>
              )}
            </div>

            {/* Date Filter — Check-in / Check-out (reactive pricing) */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Nhận phòng:</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCheckIn(val);
                      // Auto-advance checkOut if needed
                      if (val >= checkOut) {
                        const ci = new Date(val);
                        ci.setDate(ci.getDate() + 1);
                        setCheckOut(ci.toISOString().split("T")[0]);
                      }
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Trả phòng:</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <span className="text-sm text-gray-500">
                  {nights} đêm
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div data-tab-nav className="flex border-b border-gray-200 overflow-x-auto [scrollbar-width:none] mb-6">
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
              {activeTab === "rooms" && (
                <div data-section="rooms">
                  <RoomsPanel
                    pricingTable={pricingTable}
                    hotel={hotel}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    nights={nights}
                  />
                </div>
              )}
              {activeTab === "amenities" && <AmenitiesPanel hotel={hotel} />}
              {activeTab === "reviews" && (
                <div className="space-y-8">
                  <ReviewsPanel reviews={reviews} avgRating={avgRating} totalRating={totalRating} />
                  <WriteReviewForm serviceId={hotel.id} serviceType="hotel" />
                </div>
              )}
              {activeTab === "policies" && <PoliciesPanel hotel={hotel} />}
              {activeTab === "location" && <LocationPanel hotel={hotel} />}
            </div>

            {/* Related Hotels */}
            {relatedHotels.length > 0 && (
              <div className="pt-10 border-t border-gray-200 mt-10">
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
                        {h.rating?.average > 0 && (
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs font-bold text-primary shadow-sm">
                            {h.rating.average.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{h.name}</h4>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{h.address?.city || ""}</p>
                        {(h.lowestPrice || h.pricing?.basePrice) > 0 && (
                          <p className="mt-2 text-sm font-semibold text-primary">
                            Từ {formatCurrency(h.lowestPrice || h.pricing.basePrice, "VND")}/đêm
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar (1/3) */}
          <aside className="w-full lg:w-[380px] flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <HotelBookingWidget
                hotel={hotel}
                pricingTable={pricingTable}
                checkIn={checkIn}
                checkOut={checkOut}
                nights={nights}
                onDateChange={handleDateChange}
              />

              {/* Map Box */}
              {hasMap && (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Bản đồ
                    </h3>
                  </div>
                  <div className="h-[200px]">
                    <GoogleMap lat={hotel.map.lat} lng={hotel.map.lng} zoom={hotel.map.zoom || 15} />
                  </div>
                </div>
              )}

              {/* Reviews Box (compact) */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <ReviewSummaryCompact reviews={reviews} avgRating={avgRating} totalRating={totalRating} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 shadow-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Giá từ</p>
            <p className="text-lg font-bold text-primary">
              {lowestPrice > 0 ? formatCurrency(lowestPrice, "VND") : "Liên hệ"}/đêm
            </p>
          </div>
          <button
            onClick={() => {
              document.querySelector('[data-tab="rooms"]')?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-xl bg-primary text-white font-semibold text-sm px-6 py-3 hover:bg-primary-dark transition-colors shadow-sm"
          >
            Chọn phòng
          </button>
        </div>
      </div>
      <div className="h-20 lg:hidden" />
    </>
  );
}
