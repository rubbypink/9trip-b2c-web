"use client";

import { useState, useCallback } from "react";
import TourCard from "@/components/tours/TourCard";
import TourBookingWidget from "@/components/tours/TourBookingWidget";
import WriteReviewForm from "@/components/reviews/WriteReviewForm";
import Badge from "@/components/shared/Badge";
import StarRating from "@/components/shared/StarRating";
import { formatCurrency } from "@/lib/utils";
import ItineraryPanel from "@/components/tours/TourDetail/ItineraryPanel";
import ReviewsPanel from "@/components/tours/TourDetail/ReviewsPanel";
import GoogleMap from "@/components/shared/GoogleMap";
import ImageCarousel from "@/components/shared/ImageCarousel";

const TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "itinerary", label: "Lịch trình" },
  { id: "pricing", label: "Bảng giá" },
  { id: "details", label: "Chi tiết" },
  { id: "map", label: "Bản đồ" },
  { id: "reviews", label: "Đánh giá" },
  { id: "faq", label: "FAQ" },
  { id: "guide", label: "Hướng dẫn" },
];

export default function TourDetailClient({ tour, pricingTiers = [], relatedTours = [], reviews = [], avgRating = 0, totalRating = 0 }) {
  const [activeTab, setActiveTab] = useState("overview");

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const {
    title,
    featuredImage,
    gallery = [],
    excerpt,
    locationName,
    duration = {},
    pricing = {},
    isFeatured,
  } = tour;

  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;

  const hasAnyBadge =
    !!isFeatured ||
    tour.duration?.days > 0 ||
    !!tour.locationName ||
    !!tour.departurePoint ||
    !!tour.transport ||
    (tour.pricing?.discountPercent || tour.discountPercent) > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* 1. Image Gallery */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            {allImages.length > 0 ? (
              <ImageCarousel
                images={allImages}
                alt={title}
                aspectRatio="aspect-[21/9]"
                showOverlay
                serviceId={tour.id}
                serviceType="tour"
              />
            ) : (
              <div className="aspect-[21/9] bg-gray-200 flex items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
          </div>

          {/* 2. Product Info Badges */}
          <div className={`flex flex-wrap gap-3 ${hasAnyBadge ? "" : "hidden"}`}>
            {isFeatured && (
              <Badge icon="/icons/star.svg" label="Nổi bật" value="Tour nổi bật" highlight />
            )}
            {tour.duration?.days > 0 && (
              <Badge icon="/icons/time.svg" label="Thời gian" value={`${tour.duration.days} ngày ${tour.duration.nights || tour.duration.days - 1 || 0} đêm`} />
            )}
            {tour.locationName && (
              <Badge icon="/icons/location.svg" label="Địa điểm" value={tour.locationName} />
            )}
            {tour.departurePoint && (
              <Badge icon="/icons/flag.svg" label="Xuất phát" value={tour.departurePoint} />
            )}
            {tour.transport && (
              <Badge icon="/icons/truck.svg" label="Phương tiện" value={tour.transport} />
            )}
            {(tour.pricing?.discountPercent || tour.discountPercent) > 0 && (
              <Badge icon="/icons/ticket.svg" label="Ưu đãi" value={`Giảm ${tour.pricing?.discountPercent || tour.discountPercent}%`} highlight />
            )}
          </div>

          {/* 3. Title + Meta */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              {locationName && (
                <span className="inline-flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {locationName}
                </span>
              )}
              {duration.days > 0 && (
                <span className="inline-flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {duration.days} ngày{duration.nights || duration.days - 1 ? ` ${duration.nights || duration.days - 1} đêm` : ""}
                </span>
              )}
              <StarRating rating={avgRating} showCount reviewCount={totalRating} />
              {tour.viewCount > 0 && (
                <span>{tour.viewCount.toLocaleString("vi-VN")} lượt xem</span>
              )}
            </div>
            {excerpt && <p className="text-gray-600 mt-3">{excerpt}</p>}
          </div>

          {/* 4. Tab Navigation + Tab Panels */}
          <div>
            <nav className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-shrink-0 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="min-h-[300px] pt-6">
              <div data-tab-panel="overview" className={activeTab === "overview" ? "" : "hidden"}>
                <div className="space-y-6">
                  {tour.description && (
                    <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: tour.description }} />
                  )}
                  {tour.highlights?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Điểm nổi bật</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tour.highlights.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div data-tab-panel="itinerary" className={activeTab === "itinerary" ? "" : "hidden"}>
                <ItineraryPanel itinerary={tour.itinerary} />
              </div>

              <div data-tab-panel="pricing" className={activeTab === "pricing" ? "" : "hidden"}>
                <div className="space-y-6">
                  {pricingTiers.length > 0 ? (
                    <>
                      <p className="text-sm text-gray-500">Bảng giá chi tiết các gói dịch vụ:</p>
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-4 py-3 font-semibold text-gray-900">Gói dịch vụ</th>
                              <th className="text-right px-4 py-3 font-semibold text-gray-900">Người lớn</th>
                              <th className="text-right px-4 py-3 font-semibold text-gray-900">Trẻ em</th>
                              <th className="text-right px-4 py-3 font-semibold text-gray-900">Số khách</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pricingTiers.map((tier) => (
                              <tr key={tier.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{tier.name}</td>
                                <td className="px-4 py-3 text-right font-semibold text-blue-600">
                                  {tier.adultPrice > 0 ? formatCurrency(tier.adultPrice, tier.currency || "VND") : "Liên hệ"}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {tier.childPrice != null ? formatCurrency(tier.childPrice, tier.currency || "VND") : "—"}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-500">
                                  {tier.minPeople || 1}-{tier.maxPeople || 99} khách
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      <p className="text-lg font-semibold text-gray-900 mb-1">
                        {tour.pricing?.adultPrice > 0 ? formatCurrency(tour.pricing.adultPrice, "VND") : "Liên hệ"}
                      </p>
                      <p className="text-sm">Giá cơ bản cho 1 người</p>
                    </div>
                  )}
                </div>
              </div>

              <div data-tab-panel="details" className={activeTab === "details" ? "" : "hidden"}>
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${tour.included?.length > 0 || tour.excluded?.length > 0 ? "" : "hidden"}`}>
                  {tour.included?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Bao gồm
                      </h3>
                      <ul className="space-y-1.5">
                        {tour.included.map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-600 pl-7">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.excluded?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Không bao gồm
                      </h3>
                      <ul className="space-y-1.5">
                        {tour.excluded.map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-600 pl-7">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {tour.included?.length === 0 && tour.excluded?.length === 0 && (
                  <div className="text-center py-10 text-gray-500">Chưa có thông tin chi tiết.</div>
                )}
              </div>

              <div data-tab-panel="map" className={activeTab === "map" ? "" : "hidden"}>
                {tour.map?.lat && tour.map?.lng ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <GoogleMap
                      lat={tour.map.lat}
                      lng={tour.map.lng}
                      zoom={tour.map.zoom || 13}
                      markers={[{ lat: tour.map.lat, lng: tour.map.lng, title: tour.title }]}
                      height="400px"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <div className="p-10 text-center text-gray-500">Chưa có thông tin bản đồ.</div>
                  </div>
                )}
              </div>

              <div data-tab-panel="reviews" className={activeTab === "reviews" ? "" : "hidden"}>
                <div className="space-y-8">
                  <ReviewsPanel ratingAverage={avgRating} ratingCount={totalRating} reviews={reviews} />
                  <WriteReviewForm serviceId={tour.id} serviceType="tour" />
                </div>
              </div>

              <div data-tab-panel="faq" className={activeTab === "faq" ? "" : "hidden"}>
                {tour.faq?.length > 0 ? (
                  <div className="space-y-2">
                    {tour.faq.map((item, idx) => (
                      <details key={idx} className="group rounded-xl border border-gray-200">
                        <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-xl group-open:rounded-b-none">
                          {item.question}
                          <svg className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="px-5 pb-4 text-sm text-gray-600">{item.answer}</div>
                      </details>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <p>Chưa có câu hỏi thường gặp cho tour này.</p>
                  </div>
                )}
              </div>

              <div data-tab-panel="guide" className={activeTab === "guide" ? "" : "hidden"}>
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-6">Hướng dẫn đặt tour:</p>
                  <ol className="space-y-3 text-sm text-left max-w-md mx-auto">
                    {["Chọn ngày khởi hành và gói dịch vụ phù hợp.", "Nhập số lượng khách và tiến hành thanh toán.", "Nhận voucher điện tử qua Zalo/Email (có mã QR).", "Xuất trình voucher tại điểm khởi hành."].map((step, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span className="text-gray-700 pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Related Tours */}
          {relatedTours.length > 0 && (
            <div className="pt-10 border-t border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-5">Tour tương tự</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedTours.slice(0, 3).map((relatedTour) => (
                  <TourCard key={relatedTour.id} tour={relatedTour} variant="grid" showBadge={false} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking Sidebar */}
        <aside className="lg:w-96 flex-shrink-0">
          <div className="sticky top-24">
            <TourBookingWidget
              pricingTiers={pricingTiers || []}
              tourTitle={title}
              tourId={tour.id}
              basePrice={pricing?.adultPrice || 0}
              baseChildPrice={pricing?.childPrice || 0}
              baseInfantPrice={pricing?.infantPrice || 0}
              currency={pricing?.currency || "VND"}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
