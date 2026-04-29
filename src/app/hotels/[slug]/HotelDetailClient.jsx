"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import OverviewPanel from "@/components/hotels/HotelDetail/OverviewPanel";
import RoomsPanel from "@/components/hotels/HotelDetail/RoomsPanel";
import AmenitiesPanel from "@/components/hotels/HotelDetail/AmenitiesPanel";
import LocationPanel from "@/components/hotels/HotelDetail/LocationPanel";
import ReviewsPanel from "@/components/hotels/HotelDetail/ReviewsPanel";
import PoliciesPanel from "@/components/hotels/HotelDetail/PoliciesPanel";

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
 * Hotels v4: sử dụng panel components riêng biệt, pricing table với quantity selector.
 *
 * @param {{
 *   hotel: Object,
 *   pricingTable: Array<Object>,
 *   reviews: Array<Object>,
 *   avgRating: number,
 *   totalRating: number,
 *   relatedHotels: Array<Object>,
 *   checkIn: string,
 *   checkOut: string,
 *   nights: number,
 * }} props
 */
export default function HotelDetailClient({
  hotel,
  pricingTable = [],
  reviews = [],
  avgRating = 0,
  totalRating = 0,
  relatedHotels = [],
  checkIn = "",
  checkOut = "",
  nights = 1,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Get lowest price for badge
  const lowestPrice = pricingTable.length > 0
    ? Math.min(...pricingTable.flatMap((r) => r.rateTypes.map((rt) => rt.avgSellPrice)))
    : hotel.pricing?.basePrice || 0;

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
        {lowestPrice > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700">
            💰 Từ {formatCurrency(lowestPrice, "VND")}/đêm
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
        {activeTab === "rooms" && (
          <RoomsPanel
            pricingTable={pricingTable}
            hotel={hotel}
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nights}
          />
        )}
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
