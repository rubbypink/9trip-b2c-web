"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  getHotelBySlug,
  getRelatedHotels,
  getHotelReviews,
  getHotelPriceSchedule,
  buildRoomPricingTable,
} from "@/lib/firestore";
import { resolveDocImages, resolveDocsImages } from "@/lib/storage";
import OverviewPanel from "@/components/hotels/HotelDetail/OverviewPanel";
import RoomsPanel from "@/components/hotels/HotelDetail/RoomsPanel";
import AmenitiesPanel from "@/components/hotels/HotelDetail/AmenitiesPanel";
import LocationPanel from "@/components/hotels/HotelDetail/LocationPanel";
import ReviewsPanel from "@/components/hotels/HotelDetail/ReviewsPanel";
import PoliciesPanel from "@/components/hotels/HotelDetail/PoliciesPanel";
import HotelHeader from "@/components/hotels/HotelHeader";
import HotelBookingWidget from "@/components/hotels/HotelBookingWidget";

const HOTEL_TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "rooms", label: "Phòng & Giá" },
  { id: "amenities", label: "Tiện ích" },
  { id: "location", label: "Vị trí" },
  { id: "reviews", label: "Đánh giá" },
  { id: "policies", label: "Chính sách" },
];

/**
 * HotelDetailClient — Client component tự fetch mọi dữ liệu từ Firestore.
 * Tránh lỗi composite index bằng cách fetch toàn bộ data rồi xử lý ở client.
 *
 * @param {{ slug: string }} props
 */
export default function HotelDetailClient({ slug }) {
  const [hotel, setHotel] = useState(null);
  const [pricingTable, setPricingTable] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRating, setTotalRating] = useState(0);
  const [relatedHotels, setRelatedHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      console.log(`[HotelDetailClient] 🏨 Bắt đầu fetch cho slug="${slug}"`);

      try {
        // ── 1. Fetch hotel ──────────────────────────────────
        console.log(`[HotelDetailClient] ⏳ Fetching hotel by slug="${slug}"...`);
        const { hotel: rawHotel } = await getHotelBySlug(slug);
        if (!rawHotel) {
          console.error(`[HotelDetailClient] ❌ Hotel not found for slug="${slug}"`);
          if (!cancelled) setError("Khách sạn không tồn tại.");
          return;
        }
        console.log(`[HotelDetailClient] ✅ Hotel loaded: id=${rawHotel.id}, name="${rawHotel.name}", rooms=${rawHotel.rooms?.length || 0}`);

        // ── 2. Fetch price schedule ──────────────────────────
        console.log(`[HotelDetailClient] ⏳ Fetching priceSchedule for hotelId=${rawHotel.id}...`);
        const priceSchedule = await getHotelPriceSchedule(rawHotel.id);
        if (priceSchedule) {
          const priceKeys = Object.keys(priceSchedule.priceData || {});
          console.log(`[HotelDetailClient] ✅ Price schedule loaded: docId=${rawHotel.id}_base_2026, priceData keys=${priceKeys.length}`);
          console.log(`[HotelDetailClient] 📊 priceData sample keys: ${priceKeys.slice(0, 5).join(", ")}`);
        } else {
          console.warn(`[HotelDetailClient] ⚠️ No price schedule found for hotelId=${rawHotel.id}. Pricing will be empty.`);
        }

        // ── 3. Fetch reviews ─────────────────────────────────
        console.log(`[HotelDetailClient] ⏳ Fetching reviews for slug="${slug}"...`);
        const { reviews: r, totalRating: tr, avgRating: ar } = await getHotelReviews(slug);
        console.log(`[HotelDetailClient] ✅ Reviews: count=${r.length}, avgRating=${ar.toFixed(1)}`);

        // ── 4. Fetch related hotels ──────────────────────────
        const cityId = rawHotel.address?.cityId;
        console.log(`[HotelDetailClient] ⏳ Fetching related hotels for locationId=${cityId}...`);
        const { hotels: rawRelated } = await getRelatedHotels(slug, cityId, 3);
        console.log(`[HotelDetailClient] ✅ Related hotels: count=${rawRelated.length}`);

        // ── 5. Resolve images ────────────────────────────────
        console.log(`[HotelDetailClient] ⏳ Resolving images...`);
        const [hotelWithImages, relatedWithImages] = await Promise.all([
          resolveDocImages(rawHotel),
          resolveDocsImages(rawRelated),
        ]);
        console.log(`[HotelDetailClient] ✅ Images resolved: featured=${!!hotelWithImages.featuredImage}`);

        // ── 6. Build pricing table ───────────────────────────
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
        const roomsMap = hotelWithImages.rooms || [];
        const rooms = Array.isArray(roomsMap) ? roomsMap : Object.values(roomsMap);
        if (rooms.length === 0) {
          console.warn(`[HotelDetailClient] ⚠️ Hotel "${rawHotel.id}" has NO embedded rooms`);
        } else {
          console.log(`[HotelDetailClient] 🛏️ Rooms data: count=${rooms.length}, IDs: ${rooms.map(r => r.id).join(", ")}`);
        }

        const pt = buildRoomPricingTable(priceSchedule, rooms, today, tomorrow);
        console.log(`[HotelDetailClient] 📊 Pricing table: ${pt.length} rooms, ${pt.reduce((s, r) => s + r.rateTypes.length, 0)} rate types`);

        // ── 7. Set state ─────────────────────────────────────
        if (!cancelled) {
          setHotel(hotelWithImages);
          setPricingTable(pt);
          setReviews(r || []);
          setAvgRating(ar || hotelWithImages.rating?.average || 0);
          setTotalRating(tr || hotelWithImages.rating?.count || 0);
          setRelatedHotels(relatedWithImages);
          setLoading(false);
          console.log(`[HotelDetailClient] ✅ All data loaded successfully for slug="${slug}"`);
        }
      } catch (err) {
        console.error(`[HotelDetailClient] ❌ Fatal error for slug="${slug}":`, err.message);
        console.error(`[HotelDetailClient] Stack:`, err.stack);
        if (!cancelled) {
          setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu.");
          setLoading(false);
        }
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [slug]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // ── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-200 rounded-xl h-[300px] md:h-[400px]" />
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
        <p className="text-center text-gray-400 text-sm mt-4">Đang tải thông tin khách sạn...</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (error || !hotel) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không thể tải dữ liệu</h2>
          <p className="text-gray-500 text-sm mb-6">{error || "Khách sạn không tồn tại."}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary text-white font-medium px-6 py-2.5 hover:bg-primary-dark transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ── Normal render ────────────────────────────────────────
  const lowestPrice = pricingTable.length > 0
    ? Math.min(...pricingTable.flatMap((r) => r.rateTypes.map((rt) => rt.avgSellPrice)))
    : hotel.pricing?.basePrice || 0;

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

      <HotelHeader hotel={hotel} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content (2/3) */}
          <div className="flex-1 min-w-0">
            {/* Info Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
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
              {lowestPrice > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700">
                  💰 Từ {formatCurrency(lowestPrice, "VND")}/đêm
                </span>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 overflow-x-auto [scrollbar-width:none] mb-6">
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
                <RoomsPanel
                  pricingTable={pricingTable}
                  hotel={hotel}
                  checkIn={new Date().toISOString().split("T")[0]}
                  checkOut={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  nights={1}
                />
              )}
              {activeTab === "amenities" && <AmenitiesPanel hotel={hotel} />}
              {activeTab === "location" && <LocationPanel hotel={hotel} />}
              {activeTab === "reviews" && (
                <ReviewsPanel reviews={reviews} avgRating={avgRating} totalRating={totalRating} />
              )}
              {activeTab === "policies" && <PoliciesPanel hotel={hotel} />}
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

          {/* Booking Sidebar (1/3) */}
          <aside className="w-full lg:w-[380px] flex-shrink-0">
            <div className="sticky top-24">
              <HotelBookingWidget
                hotelId={hotel.id}
                hotelName={hotel.name}
                rooms={pricingTable.map((r) => ({
                  id: r.roomId,
                  name: r.roomName,
                  price: r.rateTypes[0]?.avgSellPrice || hotel.pricing?.basePrice || 0,
                  currency: hotel.pricing?.currency || "VND",
                  maxAdults: r.maxGuests,
                  bedType: r.bedType,
                  featuredImage: r.featuredImage || hotel.featuredImage || "",
                }))}
                basePrice={hotel.pricing?.basePrice || 0}
                currency={hotel.pricing?.currency || "VND"}
              />
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
