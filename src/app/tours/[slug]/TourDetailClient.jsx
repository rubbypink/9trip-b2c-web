"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import TourTabs from "@/components/tours/TourDetail/TourTabs";
import BookingSidebar from "@/components/tours/TourDetail/BookingSidebar";
import TourCard from "@/components/tours/TourCard";
import WriteReviewForm from "@/components/reviews/WriteReviewForm";
import { formatCurrency } from "@/lib/utils";

const GoogleMap = dynamic(() => import("@/components/shared/GoogleMap"), { ssr: false });
const ItineraryPanel = dynamic(() => import("@/components/tours/TourDetail/ItineraryPanel"));
const ReviewsPanel = dynamic(() => import("@/components/tours/TourDetail/ReviewsPanel"));

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

/**
 * TourDetailClient — xử lý tab navigation và render nội dung tương ứng.
 * Client component vì cần state cho active tab.
 *
 * @param {{
 *   tour: object,
 *   pricingTiers: Array<object>,
 *   relatedTours: Array<object>,
 *   reviews: Array<object>,
 *   avgRating: number,
 *   totalRating: number,
 * }} props
 */
export default function TourDetailClient({ tour, pricingTiers = [], relatedTours = [], reviews = [], avgRating = 0, totalRating = 0 }) {
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const handleBookNow = useCallback(
    (bookingData) => {
      router.push(`/checkout?service=${bookingData.serviceId}&type=${bookingData.serviceType}`);
    },
    [router]
  );

  return (
    <div className="space-y-6">
      {/* Product Info Badges */}
      <div className="flex flex-wrap gap-2">
        {tour.duration?.days > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
            🕐 {tour.duration.days} ngày {tour.duration.nights || tour.duration.days - 1 || 0} đêm
          </span>
        )}
        {tour.locationName && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
            📍 {tour.locationName}
          </span>
        )}
        {tour.departurePoint && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
            🚩 Xuất phát: {tour.departurePoint}
          </span>
        )}
        {tour.transport && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
            🚌 {tour.transport}
          </span>
        )}
        {(tour.pricing?.discountPercent || tour.discountPercent) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600">
            🏷️ Giảm {tour.pricing?.discountPercent || tour.discountPercent}%
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <TourTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Description */}
            {tour.description && (
              <div
                className="prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: tour.description }}
              />
            )}

            {/* Highlights */}
            {tour.highlights?.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Điểm nổi bật</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tour.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg
                        className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === "itinerary" && (
          <ItineraryPanel itinerary={tour.itinerary} />
        )}

        {activeTab === "pricing" && (
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
        )}

        {activeTab === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Included */}
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

            {/* Excluded */}
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
        )}

        {activeTab === "map" && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <GoogleMap
              lat={tour.map?.lat}
              lng={tour.map?.lng}
              zoom={tour.map?.zoom || 13}
              markers={tour.map ? [{ lat: tour.map.lat, lng: tour.map.lng, title: tour.title }] : []}
              height="400px"
            />
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-8">
            <ReviewsPanel
              ratingAverage={avgRating}
              ratingCount={totalRating}
              reviews={reviews}
            />
            <WriteReviewForm serviceId={tour.id} serviceType="tour" />
          </div>
        )}

        {activeTab === "faq" && (
          <div>
            {tour.faq?.length > 0 ? (
              <div className="space-y-2">
                {tour.faq.map((item, idx) => (
                  <details key={idx} className="group rounded-xl border border-gray-200">
                    <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-xl group-open:rounded-b-none">
                      {item.question}
                      <svg
                        className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-4 text-sm text-gray-600">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>Chưa có câu hỏi thường gặp cho tour này.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "guide" && (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-6">Hướng dẫn đặt tour:</p>
            <ol className="space-y-3 text-sm text-left max-w-md mx-auto">
              {[
                "Chọn ngày khởi hành và gói dịch vụ phù hợp.",
                "Nhập số lượng khách và tiến hành thanh toán.",
                "Nhận voucher điện tử qua Zalo/Email (có mã QR).",
                "Xuất trình voucher tại điểm khởi hành.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Related Tours */}
      {relatedTours.length > 0 && (
        <div className="pt-10 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-5">Tour tương tự</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedTours.slice(0, 3).map((relatedTour) => (
              <TourCard
                key={relatedTour.id}
                tour={relatedTour}
                variant="grid"
                showBadge={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Attach BookingSidebar as static property để page server component có thể import
TourDetailClient.BookingSidebar = BookingSidebar;