"use client";

import { useState, useCallback, useEffect } from "react";
import TourCard from "@/components/tours/TourCard";
import TourBookingWidget from "@/components/tours/TourBookingWidget";
import WriteReviewForm from "@/components/reviews/WriteReviewForm";
import Badge from "@/components/shared/Badge";
import StarRating from "@/components/shared/StarRating";
import { formatCurrency } from "@9trip/shared/utils";
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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash && TABS.some(t => t.id === hash)) return hash;
    }
    return "overview";
  });

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && TABS.some(t => t.id === hash)) {
        setActiveTab(hash);
      }
    };
    syncFromHash();
    window.addEventListener('popstate', syncFromHash);
    return () => window.removeEventListener('popstate', syncFromHash);
  }, []);

  const {
    title,
    featuredImage,
    gallery = [],
    excerpt,
    location,
    durationDays,
    pricing = {},
    isFeatured,
  } = tour;

  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;

  const hasAnyBadge =
    !!isFeatured ||
    durationDays > 0 ||
    !!tour.location ||
    (tour.pricing?.discountPercent) > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* 1. Image Gallery */}
          <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
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
              <div className="aspect-[21/9] bg-muted flex items-center justify-center text-muted-foreground">
                Chưa có ảnh
              </div>
            )}
          </div>

          {/* 2. Product Info Badges */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className={`flex flex-wrap gap-3 ${hasAnyBadge ? "" : "hidden"}`}>
              {isFeatured && (
                <Badge icon="/icons/star.svg" label="Nổi bật" value="Tour nổi bật" highlight />
              )}
              {durationDays > 0 && (
                <Badge icon="/icons/time.svg" label="Thởi gian" value={`${durationDays} ngày ${durationDays - 1 || 0} đêm`} />
              )}
              {tour.location && (
                <Badge icon="/icons/location.svg" label="Địa điểm" value={tour.location} />
              )}
              {tour.pricing?.discountPercent > 0 && (
                <Badge icon="/icons/ticket.svg" label="Ưu đãi" value={`Giảm ${tour.pricing?.discountPercent}%`} highlight />
              )}
            </div>
          </div>

          {/* 3. Title + Meta */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {location && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {location}
                    </span>
                )}
                {durationDays > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {durationDays} ngày{durationDays - 1 > 0 ? ` ${durationDays - 1} đêm` : ""}
                    </span>
                )}
                <StarRating rating={avgRating} showCount reviewCount={totalRating} />
              </div>
              {excerpt && <p className="text-muted-foreground mt-3">{excerpt}</p>}
            </div>
          </div>

          {/* 4. Tab Navigation + Tab Panels */}
          <div>
            <nav className="flex border-b border-border overflow-x-auto scrollbar-hide bg-surface-1 rounded-t-xl" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-shrink-0 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="min-h-[300px] pt-6 bg-card rounded-xl border border-border p-6 shadow-sm">
              <div data-tab-panel="overview" className={activeTab === "overview" ? "" : "hidden"}>
                <div className="space-y-6">
                  {tour.description && (
                    <div className="prose max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: tour.description }} />
                  )}
                  {tour.highlights?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">Điểm nổi bật</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tour.highlights.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
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
                      <p className="text-sm text-muted-foreground">Bảng giá chi tiết các gói dịch vụ:</p>
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-surface-1 border-b border-border">
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Gói dịch vụ</th>
                              <th className="text-right px-4 py-3 font-semibold text-foreground">Người lớn</th>
                              <th className="text-right px-4 py-3 font-semibold text-foreground">Trẻ em</th>
                              <th className="text-right px-4 py-3 font-semibold text-foreground">Số khách</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {pricingTiers.map((tier) => (
                              <tr key={tier.id} className="hover:bg-surface-2 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">{tier.name}</td>
                                <td className="px-4 py-3 text-right font-semibold text-blue-600">
                                  {tier.adultPrice > 0 ? formatCurrency(tier.adultPrice, tier.currency || "VND") : "Liên hệ"}
                                </td>
                                <td className="px-4 py-3 text-right text-muted-foreground">
                                  {tier.childPrice != null ? formatCurrency(tier.childPrice, tier.currency || "VND") : "—"}
                                </td>
                                <td className="px-4 py-3 text-right text-muted-foreground">
                                  {tier.minPeople || 1}-{tier.maxPeople || 99} khách
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <p className="text-lg font-semibold text-foreground mb-1">
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
                      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Bao gồm
                      </h3>
                      <ul className="space-y-1.5">
                        {tour.included.map((item, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground pl-7">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.excluded?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Không bao gồm
                      </h3>
                      <ul className="space-y-1.5">
                        {tour.excluded.map((item, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground pl-7">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {tour.included?.length === 0 && tour.excluded?.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">Chưa có thông tin chi tiết.</div>
                )}
              </div>

              <div data-tab-panel="map" className={activeTab === "map" ? "" : "hidden"}>
                {tour.map?.lat && tour.map?.lng ? (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <GoogleMap
                      lat={tour.map.lat}
                      lng={tour.map.lng}
                      zoom={tour.map.zoom || 13}
                      markers={[{ lat: tour.map.lat, lng: tour.map.lng, title: tour.title }]}
                      height="400px"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <div className="p-10 text-center text-muted-foreground">Chưa có thông tin bản đồ.</div>
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
                      <details key={idx} className="group rounded-xl border border-border">
                        <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-foreground hover:bg-surface-1 rounded-xl group-open:rounded-b-none">
                          {item.question}
                          <svg className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="px-5 pb-4 text-sm text-muted-foreground">{item.answer}</div>
                      </details>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>Chưa có câu hỏi thường gặp cho tour này.</p>
                  </div>
                )}
              </div>

              <div data-tab-panel="guide" className={activeTab === "guide" ? "" : "hidden"}>
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-6">Hướng dẫn đặt tour:</p>
                  <ol className="space-y-3 text-sm text-left max-w-md mx-auto">
                    {["Chọn ngày khởi hành và gói dịch vụ phù hợp.", "Nhập số lượng khách và tiến hành thanh toán.", "Nhận voucher điện tử qua Zalo/Email (có mã QR).", "Xuất trình voucher tại điểm khởi hành."].map((step, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span className="text-foreground pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Related Tours */}
          {relatedTours.length > 0 && (
            <div className="pt-10 border-t border-border bg-card rounded-xl border border-border p-6">
              <h3 className="text-xl font-bold text-foreground mb-5">Tour tương tự</h3>
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
