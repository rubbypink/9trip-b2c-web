"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GoogleMap from "@/components/shared/GoogleMap";
import StarRating from "@/components/shared/StarRating";
import { formatCurrency } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "details", label: "Chi tiết" },
  { id: "map", label: "Bản đồ" },
  { id: "reviews", label: "Đánh giá" },
  { id: "faq", label: "FAQ" },
];

/**
 * ActivityDetailClient — tab navigation cho chi tiết hoạt động.
 * @param {{
 *   activity: object,
 *   reviews: Array<object>,
 *   avgRating: number,
 *   totalRating: number,
 * }} props
 */
export default function ActivityDetailClient({ activity, reviews = [], avgRating = 0, totalRating = 0 }) {
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const handleBookNow = useCallback(() => {
    router.push(`/checkout?service=${activity.id}&type=activity`);
  }, [router, activity.id]);

  const {
    title,
    featuredImage,
    gallery = [],
    description,
    excerpt,
    locationName,
    pricing = {},
    duration = {},
    included = [],
    excluded = [],
    highlights = [],
    faq = [],
    map,
  } = activity;

  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;
  const price = pricing?.basePrice || pricing?.adultPrice || 0;
  const currency = pricing?.currency || "VND";
  const discountPct = pricing?.discountPercent || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Gallery */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-1 max-h-[420px] overflow-hidden">
              {allImages.length > 0 ? (
                <>
                  <div className="md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto relative">
                    <Image src={allImages[0]} alt={title} fill className="object-cover" priority sizes="50vw" />
                  </div>
                  {allImages[1] && (
                    <div className="hidden md:block aspect-[4/3] relative">
                      <Image src={allImages[1]} alt={`${title} - 2`} fill className="object-cover" sizes="25vw" />
                    </div>
                  )}
                  {allImages[2] && (
                    <div className="hidden md:block aspect-[4/3] relative">
                      <Image src={allImages[2]} alt={`${title} - 3`} fill className="object-cover" sizes="25vw" />
                    </div>
                  )}
                  {allImages[3] && (
                    <div className="hidden md:block aspect-[4/3] relative">
                      <Image src={allImages[3]} alt={`${title} - 4`} fill className="object-cover" sizes="25vw" />
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-4 aspect-[21/9] bg-gray-200 flex items-center justify-center text-gray-400">
                  Chưa có ảnh
                </div>
              )}
            </div>
          </div>

          {/* Title + Meta */}
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
              {duration?.days > 0 && (
                <span>{duration.days} ngày {duration.nights || duration.days - 1 || 0} đêm</span>
              )}
              <StarRating rating={avgRating} showCount reviewCount={totalRating} />
            </div>
            {excerpt && <p className="text-gray-600 mt-3">{excerpt}</p>}
          </div>

          {/* Tabs */}
          <div>
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {TABS.map((tab) => (
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

            <div className="min-h-[300px] pt-6">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {description && (
                    <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: description }} />
                  )}
                  {highlights.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Điểm nổi bật</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {highlights.map((item, idx) => (
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
              )}

              {activeTab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {included.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Bao gồm
                      </h3>
                      <ul className="space-y-1.5">
                        {included.map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-600 pl-7">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {excluded.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Không bao gồm
                      </h3>
                      <ul className="space-y-1.5">
                        {excluded.map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-600 pl-7">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "map" && (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  {map?.lat && map?.lng ? (
                    <GoogleMap
                      lat={map.lat}
                      lng={map.lng}
                      zoom={map.zoom || 13}
                      markers={[{ lat: map.lat, lng: map.lng, title }]}
                      height="400px"
                    />
                  ) : (
                    <div className="p-10 text-center text-gray-500">Chưa có thông tin bản đồ.</div>
                  )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                        <StarRating rating={avgRating} showCount reviewCount={totalRating} />
                      </div>
                      {reviews.map((review) => (
                        <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm text-gray-900">{review.userName || "Khách hàng"}</span>
                            <StarRating rating={review.rating} />
                            <span className="text-xs text-gray-400 ml-auto">{review.createdAt}</span>
                          </div>
                          <p className="text-sm text-gray-700">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500">Chưa có đánh giá nào.</div>
                  )}
                </div>
              )}

              {activeTab === "faq" && (
                <div>
                  {faq.length > 0 ? (
                    <div className="space-y-2">
                      {faq.map((item, idx) => (
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
                    <div className="text-center py-10 text-gray-500">Chưa có câu hỏi thường gặp.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <aside className="lg:w-96 flex-shrink-0">
          <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Giá từ</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {price > 0 ? formatCurrency(price, currency) : "Liên hệ"}
                </span>
                {price > 0 && <span className="text-sm text-gray-500">/ người</span>}
              </div>
              {discountPct > 0 && (
                <span className="inline-block mt-1 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                  Giảm {discountPct}%
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {duration?.days > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {duration.days} ngày {duration.nights || duration.days - 1 || 0} đêm
                </div>
              )}

              <button
                onClick={handleBookNow}
                className="w-full rounded-lg bg-primary text-white font-semibold px-6 py-3 hover:bg-primary-dark transition-colors"
              >
                Đặt ngay
              </button>

              <p className="text-xs text-center text-gray-400">Thanh toán an toàn, xác nhận tức thì</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
