"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Badge from "@/components/shared/Badge";
import StarRating from "@/components/shared/StarRating";
import ActivityCard from "@/components/shared/ActivityCard";
import ActivityBookingWidget from "@/components/activities/ActivityBookingWidget";
import ImageCarousel from "@/components/shared/ImageCarousel";
import GoogleMap from "@/components/shared/GoogleMap";
import WriteReviewForm from "@/components/reviews/WriteReviewForm";
import { formatCurrency } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "pricing", label: "Bảng giá" },
  { id: "details", label: "Chi tiết" },
  { id: "schedule", label: "Giờ mở cửa" },
  { id: "guide", label: "Hướng dẫn" },
  { id: "map", label: "Bản đồ" },
  { id: "reviews", label: "Đánh giá" },
  { id: "faq", label: "FAQ" },
];

/**
 * ActivityDetailClient — Tab navigation cho chi tiết hoạt động.
 * Hỗ trợ pricing tiers, booking widget, policies, schedule, purchase guide,
 * related activities, và product info badges.
 *
 * @param {{
 *   activity: object,
 *   pricingTiers: Array<object>,
 *   relatedActivities: Array<object>,
 *   reviews: Array<object>,
 *   avgRating: number,
 *   totalRating: number,
 * }} props
 */
export default function ActivityDetailClient({
  activity,
  pricingTiers = [],
  relatedActivities = [],
  reviews = [],
  avgRating = 0,
  totalRating = 0,
}) {
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
    description,
    excerpt,
    locationName,
    pricing = {},
    duration = {},
    duration: { days, hours, minutes } = {},
    included = [],
    excluded = [],
    highlights = [],
    faq = [],
    map,
    // Extended fields
    openingHours,
    durationDetail,
    locationDetail,
    recommendation,
    capacity,
    childrenPolicy,
    cancellationPolicy,
    notes = [],
    purchaseGuide = [],
    tags = [],
  } = activity;

  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;
  const price = pricing?.basePrice || pricing?.adultPrice || 0;
  const currency = pricing?.currency || "VND";
  const discountPct = pricing?.discountPercent || 0;

  const showPricing = pricingTiers.length > 0 || (Array.isArray(included) && included.length > 0) || (Array.isArray(excluded) && excluded.length > 0);

  const hasAnyBadge =
    (typeof duration === "object" ? !!(days || hours) : !!duration) ||
    discountPct > 0 ||
    !!openingHours ||
    !!locationName ||
    capacity > 0;

  const hasDetails = included.length > 0 || excluded.length > 0;

  const hasPolicies = !!childrenPolicy || !!cancellationPolicy || notes.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Image Gallery — Banner style with carousel */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
            {allImages.length > 0 ? (
              <ImageCarousel
                images={allImages}
                alt={title}
                aspectRatio="aspect-[21/9]"
                showOverlay={false}
                serviceId={activity.id}
                serviceType="activity"
              />
            ) : (
              <div className="aspect-[21/9] bg-gray-200 flex items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
          </div>

          {/* Product Info Badges */}
          <div className={`flex flex-wrap gap-3 ${hasAnyBadge ? "" : "hidden"}`}>
            {(typeof duration === "object" && (days || hours)) ? (
              <Badge icon="/icons/time.svg" label="Thời gian" value={
                days > 0 ? `${days} ngày${hours > 0 ? ` ${hours}h` : ""}` : `${hours || 0}h${minutes > 0 ? `${minutes}p` : ""}`
              } />
            ) : activity.duration ? (
              <Badge icon="/icons/time.svg" label="Thời gian" value={activity.duration} />
            ) : null}
            {discountPct > 0 && (
              <Badge
                icon="/icons/ticket.svg"
                label="Ưu đãi"
                value={`Giảm ${discountPct}%`}
                highlight
              />
            )}
            {openingHours && (
              <Badge icon="/icons/clock.svg" label="Giờ diễn" value={openingHours} />
            )}
            {locationName && (
              <Badge icon="/icons/location.svg" label="Địa điểm" value={locationName} />
            )}
            {capacity > 0 && (
              <Badge icon="/icons/users.svg" label="Sức chứa" value={`${capacity.toLocaleString()} người`} />
            )}
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
              {(days > 0 || hours > 0) && (
                <span>
                  {days > 0 ? `${days} ngày${hours > 0 ? ` ${hours}h` : ""}` : `${hours || 0}h${minutes > 0 ? `${minutes}p` : ""}`}
                </span>
              )}
              <StarRating rating={avgRating} showCount reviewCount={totalRating} />
            </div>
            {excerpt && <p className="text-gray-600 mt-3">{excerpt}</p>}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div>
            <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-[300px] pt-6">
              <div data-tab-panel="overview" className={activeTab === "overview" ? "" : "hidden"}>
                {description || highlights.length > 0 ? (
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
                ) : (
                  <div className="text-center py-10 text-gray-500">Chưa có thông tin tổng quan.</div>
                )}
              </div>

              <div data-tab-panel="pricing" className={activeTab === "pricing" ? "" : "hidden"}>
                <div className="space-y-6">
                  {pricingTiers.length > 0 ? (
                    <>
                      <p className="text-sm text-gray-500">
                        Bảng giá chi tiết các gói dịch vụ. Giá có thể thay đổi theo từng thời điểm.
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-4 py-3 font-semibold text-gray-900">Gói dịch vụ</th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-900">Mô tả</th>
                              <th className="text-right px-4 py-3 font-semibold text-gray-900">Người lớn</th>
                              <th className="text-right px-4 py-3 font-semibold text-gray-900">Trẻ em</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pricingTiers.map((tier) => (
                              <tr key={tier.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{tier.name}</td>
                                <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={tier.description}>{tier.description || "—"}</td>
                                <td className="px-4 py-3 text-right font-semibold text-blue-600">
                                  {formatCurrency(tier.adultPrice, tier.currency || currency)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {tier.childPrice != null
                                    ? formatCurrency(tier.childPrice, tier.currency || currency)
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {pricingTiers.some((t) => t.included?.length > 0) && (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-gray-900">Bao gồm theo gói</h3>
                          {pricingTiers.filter((t) => t.included?.length > 0).map((tier) => (
                            <div key={tier.id} className="bg-gray-50 rounded-xl p-4">
                              <h4 className="font-medium text-gray-900 text-sm mb-2">{tier.name}</h4>
                              <ul className="space-y-1">
                                {tier.included.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                    <svg className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      {price > 0 ? (
                        <div>
                          <p className="text-lg font-semibold text-gray-900 mb-1">{formatCurrency(price, currency)}</p>
                          <p className="text-sm">Giá cơ bản cho 1 người</p>
                        </div>
                      ) : (
                        <p>Chưa có thông tin giá.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div data-tab-panel="details" className={activeTab === "details" ? "" : "hidden"}>
                <div className="space-y-6">
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${hasDetails ? "" : "hidden"}`}>
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
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <svg className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {item}
                            </li>
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
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <svg className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {!hasDetails && !hasPolicies && (
                    <div className="text-center py-6 text-gray-500">Chưa có thông tin chi tiết.</div>
                  )}

                  {hasPolicies && (
                    <div className="border-t border-gray-200 pt-6 space-y-4">
                      {childrenPolicy && (
                        <PolicyCard
                          icon={
                            <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                          }
                          title="Chính sách trẻ em"
                          content={childrenPolicy}
                        />
                      )}
                      {cancellationPolicy && (
                        <PolicyCard
                          icon={
                            <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          }
                          title="Chính sách hủy vé"
                          content={cancellationPolicy}
                        />
                      )}
                      {notes.length > 0 && (
                        <PolicyCard
                          icon={
                            <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          }
                          title="Lưu ý"
                          content={notes.map((n, i) => <p key={i} className="text-sm text-gray-600">{i + 1}. {n}</p>)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div data-tab-panel="schedule" className={activeTab === "schedule" ? "" : "hidden"}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {openingHours && <ScheduleCard label="Giờ diễn" value={openingHours} />}
                    {durationDetail && <ScheduleCard label="Thời lượng" value={durationDetail} />}
                    {locationDetail && <ScheduleCard label="Địa điểm" value={locationDetail} />}
                    {recommendation && <ScheduleCard label="Khuyến nghị" value={recommendation} />}
                  </div>
                  {!openingHours && !durationDetail && !locationDetail && !recommendation && (
                    <div className="text-center py-10 text-gray-500">Chưa có thông tin giờ mở cửa.</div>
                  )}
                </div>
              </div>

              <div data-tab-panel="guide" className={activeTab === "guide" ? "" : "hidden"}>
                <div>
                  {purchaseGuide.length > 0 ? (
                    <div className="space-y-6">
                      <p className="text-sm text-gray-500">Hướng dẫn mua vé chi tiết:</p>
                      {purchaseGuide.map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-sm text-gray-700">{step}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      <p>Đặt vé trực tiếp qua 9 Trip:</p>
                      <ol className="mt-3 space-y-2 text-sm text-left max-w-md mx-auto">
                        <li className="flex gap-3">
                          <span className="font-bold text-blue-600">1.</span>
                          Chọn ngày và gói dịch vụ bên cạnh.
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-blue-600">2.</span>
                          Nhập số lượng khách và tiến hành thanh toán.
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-blue-600">3.</span>
                          Nhận voucher điện tử qua Zalo/Email (có mã QR).
                        </li>
                        <li className="flex gap-3">
                          <span className="font-bold text-blue-600">4.</span>
                          Xuất trình mã QR tại cổng check-in.
                        </li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>

              <div data-tab-panel="map" className={activeTab === "map" ? "" : "hidden"}>
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
              </div>

              <div data-tab-panel="reviews" className={activeTab === "reviews" ? "" : "hidden"}>
                <div className="space-y-8">
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
                    <div className="text-center py-10 text-gray-500">
                      <p>Chưa có đánh giá nào.</p>
                      <p className="text-xs text-gray-400 mt-1">Hãy là người đầu tiên đánh giá hoạt động này.</p>
                    </div>
                  )}
                  <WriteReviewForm serviceId={activity.id} serviceType="activity" />
                </div>
              </div>

              <div data-tab-panel="faq" className={activeTab === "faq" ? "" : "hidden"}>
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
              </div>
            </div>
          </div>

          {/* Related Activities */}
          {relatedActivities.length > 0 && (
            <div className="pt-10 border-t border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-5">Có thể bạn sẽ thích</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedActivities.map((related) => (
                  <ActivityCard key={related.id} activity={related} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking Sidebar — ActivityBookingWidget */}
        <aside className="lg:w-96 flex-shrink-0">
          <div className="sticky top-24">
            <ActivityBookingWidget
              pricingTiers={pricingTiers}
              activityTitle={title}
              activityId={activity.id}
              featuredImage={featuredImage}
              basePrice={price}
              currency={currency}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Internal Sub-components ──────────────────────────────────────────

/**
 * PolicyCard — Displays a policy section with icon and content.
 * @param {{ icon: JSX.Element, title: string, content: string|JSX.Element }} props
 */
function PolicyCard({ icon, title, content }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div>
          <h4 className="font-semibold text-gray-900 text-sm mb-1">{title}</h4>
          <div className="text-sm text-gray-600">{content}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * ScheduleCard — Displays a schedule info item.
 * @param {{ label: string, value: string }} props
 */
function ScheduleCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
