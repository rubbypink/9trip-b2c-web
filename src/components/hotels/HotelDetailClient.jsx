"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/shared/Badge";
import { formatCurrency } from "@/lib/utils";
import { buildRoomPricingTable } from "@/lib/firestore";
import ImageCarousel from "@/components/shared/ImageCarousel";
import GoogleMap from "@/components/shared/GoogleMap";
import { ReviewSummaryCompact, WishlistButton, ShareButton } from "@/components/hotels/HotelHeader";
import HotelBookingWidget from "@/components/hotels/HotelBookingWidget";
import OverviewPanel from "@/components/hotels/HotelDetail/OverviewPanel";
import RoomsPanel from "@/components/hotels/HotelDetail/RoomsPanel";
import AmenitiesPanel from "@/components/hotels/HotelDetail/AmenitiesPanel";
import PoliciesPanel from "@/components/hotels/HotelDetail/PoliciesPanel";
import LocationPanel from "@/components/hotels/HotelDetail/LocationPanel";
import ReviewsPanel from "@/components/hotels/HotelDetail/ReviewsPanel";
import WriteReviewForm from "@/components/reviews/WriteReviewForm";

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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash && HOTEL_TABS.some(t => t.id === hash)) return hash;
    }
    return "overview";
  });

  // ── Hotel field destructuring ───────────────────────────
  const {
    name,
    featuredImage,
    gallery = [],
    description,
    excerpt,
    address = {},
    starRating = 0,
    map: hotelMap,
    pricing = {},
  } = hotel;

  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;
  const hasMap = hotelMap?.lat && hotelMap?.lng;

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
    try {
      if (!hotel || !priceSchedule) return [];
      const roomsMap = hotel?.rooms || [];
      // Đảm bảo mỗi room đều có ID nếu rooms được lưu dạng Map
      const rooms = (Array.isArray(roomsMap) 
        ? roomsMap 
        : Object.entries(roomsMap).map(([id, r]) => ({ ...(r || {}), id: r?.id || id }))
      ).filter(r => r?.isActive);
      if (rooms.length === 0) return [];
      return buildRoomPricingTable(priceSchedule, rooms, checkIn, checkOut) || [];
    } catch (error) {
      console.error('[HotelDetailClient] Error building pricingTable:', error);
      return [];
    }
  }, [priceSchedule, hotel?.rooms, checkIn, checkOut]);

  // ── Lowest price with safe fallback ──────────────────────
  const lowestPrice = useMemo(() => {
    try {
      if (!pricingTable || pricingTable.length === 0) {
        return hotel?.pricing?.basePrice || 0;
      }
      const prices = pricingTable
        .flatMap((r) => (Array.isArray(r?.rateTypes) ? r.rateTypes : []).map((rt) => rt?.avgSellPrice || 0))
        .filter((p) => p > 0);
      return prices.length > 0 ? Math.min(...prices) : (hotel?.pricing?.basePrice || 0);
    } catch (error) {
      console.error('[HotelDetailClient] Error calculating lowestPrice:', error);
      return hotel?.pricing?.basePrice || 0;
    }
  }, [pricingTable, hotel]);

  const hasAnyBadge = starRating > 0 || !!address?.city || avgRating > 0 || lowestPrice > 0;

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && HOTEL_TABS.some(t => t.id === hash)) {
        setActiveTab(hash);
      }
    };
    syncFromHash();
    window.addEventListener('popstate', syncFromHash);
    return () => window.removeEventListener('popstate', syncFromHash);
  }, []);

  // ── Room Quantities State ───────────────────────────────
  const [roomQuantities, setRoomQuantities] = useState({});

  const handleRoomQuantityChange = useCallback((roomId, rateType, delta, maxRooms = 10) => {
    setRoomQuantities(prev => {
      const key = `${roomId}_${rateType}`;
      const current = prev[key] || 0;
      const next = Math.max(0, Math.min(maxRooms, current + delta));
      return { ...prev, [key]: next };
    });
  }, []);

  const handleDateChange = useCallback((newCheckIn, newCheckOut) => {
    if (newCheckIn) setCheckIn(newCheckIn);
    if (newCheckOut) setCheckOut(newCheckOut);
  }, []);

  const handleBookNow = useCallback(() => {
    handleTabChange("rooms");
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
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* 1. Image Gallery */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
              {allImages.length > 0 ? (
                <ImageCarousel
                  images={allImages}
                  alt={name}
                  aspectRatio="aspect-[21/9]"
                  showOverlay={false}
                  serviceId={hotel.id}
                  serviceType="hotel"
                />
              ) : (
                <div className="aspect-[21/9] bg-muted flex items-center justify-center text-muted-foreground">
                  Chưa có ảnh
                </div>
              )}
            </div>

            {/* 2. Info Badges */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className={`flex flex-wrap gap-3 ${hasAnyBadge ? "" : "hidden"}`}>
                {starRating > 0 && (
                  <Badge icon="/icons/star.svg" label="Xếp hạng" value={`${starRating} sao`} />
                )}
                {address?.city && (
                  <Badge icon="/icons/location.svg" label="Địa điểm" value={address.city} />
                )}
                {avgRating > 0 && (
                  <Badge icon="/icons/star.svg" label="Đánh giá" value={`${avgRating.toFixed(1)} (${totalRating} đánh giá)`} />
                )}
                {lowestPrice > 0 && (
                  <Badge icon="/icons/tag.svg" label="Giá" value={`Từ ${formatCurrency(lowestPrice, "VND")}/đêm`} highlight />
                )}
              </div>
            </div>

            {/* 3. Title + Meta */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{name}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {address?.city && (
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {[address.street, address.city, address.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {avgRating > 0 && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <span className="text-muted-foreground">|</span>
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                        {totalRating > 0 && <span>({totalRating})</span>}
                      </span>
                    )}
                  </div>
                  {excerpt && <p className="text-muted-foreground mt-3 line-clamp-2">{excerpt}</p>}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <WishlistButton hotelId={hotel.id} />
                    <ShareButton url={typeof window !== "undefined" ? window.location.href : ""} title={name} />
                  </div>
                  <button
                    type="button"
                    onClick={handleBookNow}
                    className="w-full sm:w-auto rounded-xl bg-primary text-white text-sm font-semibold px-6 py-2.5 shadow-sm hover:bg-primary-dark transition-colors"
                  >
                    Đặt ngay
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Date Filter — Check-in / Check-out (reactive pricing) */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">Nhận phòng:</label>
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
                    className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">Trả phòng:</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn}
                    className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {nights} đêm
                </span>
              </div>
            </div>

            {/* 5. Tab Navigation */}
            <div>
              <div data-tab-nav className="flex border-b border-border overflow-x-auto scrollbar-hide">
                {HOTEL_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="min-h-[300px] pt-6 bg-card rounded-xl border border-border p-6 shadow-sm">
                <div data-tab-panel="overview" className={activeTab === "overview" ? "" : "hidden"}>
                  <OverviewPanel hotel={hotel} />
                </div>
                <div data-tab-panel="rooms" className={activeTab === "rooms" ? "" : "hidden"}>
                  <div data-section="rooms">
                    <RoomsPanel
                      pricingTable={pricingTable}
                      hotel={hotel}
                      checkIn={checkIn}
                      checkOut={checkOut}
                      nights={nights}
                      roomQuantities={roomQuantities}
                      onRoomQuantityChange={handleRoomQuantityChange}
                    />
                  </div>
                </div>
                <div data-tab-panel="amenities" className={activeTab === "amenities" ? "" : "hidden"}>
                  <AmenitiesPanel hotel={hotel} />
                </div>
                <div data-tab-panel="reviews" className={activeTab === "reviews" ? "" : "hidden"}>
                  <div className="space-y-8">
                    <ReviewsPanel reviews={reviews} avgRating={avgRating} totalRating={totalRating} />
                    <WriteReviewForm serviceId={hotel.id} serviceType="hotel" />
                  </div>
                </div>
                <div data-tab-panel="policies" className={activeTab === "policies" ? "" : "hidden"}>
                  <PoliciesPanel hotel={hotel} />
                </div>
                <div data-tab-panel="location" className={activeTab === "location" ? "" : "hidden"}>
                  <LocationPanel hotel={hotel} />
                </div>
              </div>
            </div>

            {/* 6. Related Hotels */}
            {relatedHotels.length > 0 && (
              <div className="pt-10 border-t border-border bg-card rounded-xl border border-border p-6">
                <h3 className="text-xl font-bold text-foreground mb-5">Khách sạn tương tự</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedHotels.map((h) => (
                    <Link
                      key={h.id}
                      href={`/hotels/${h.slug}`}
                      className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-[4/3] relative bg-muted">
                        {h.featuredImage ? (
                          <Image src={h.featuredImage} alt={h.name} fill className="object-cover" sizes="33vw" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">No image</div>
                        )}
                        {h.rating?.average > 0 && (
                          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs font-bold text-primary shadow-sm">
                            {h.rating.average.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{h.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{h.address?.city || ""}</p>
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

          {/* Booking Sidebar */}
          <aside className="lg:w-96 flex-shrink-0">
            <div className="sticky top-24">
              <HotelBookingWidget
                hotel={hotel}
                pricingTable={pricingTable}
                checkIn={checkIn}
                checkOut={checkOut}
                nights={nights}
                onDateChange={handleDateChange}
                roomQuantities={roomQuantities}
                onRoomQuantityChange={handleRoomQuantityChange}
              />

              {/* Map Box */}
              {hasMap && (
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm mt-6">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Bản đồ
                    </h3>
                  </div>
                  <div className="h-[200px]">
                    <GoogleMap lat={hotelMap.lat} lng={hotelMap.lng} zoom={hotelMap.zoom || 15} />
                  </div>
                </div>
              )}

              {/* Reviews Box (compact) */}
              <div className="rounded-2xl border border-border bg-card shadow-sm mt-6">
                <ReviewSummaryCompact reviews={reviews} avgRating={avgRating} totalRating={totalRating} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t border-border shadow-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Giá từ</p>
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


