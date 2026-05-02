"use client";

import React, { useState, useCallback, useEffect } from "react";
import ImageCarousel from "@/components/shared/ImageCarousel";
import LoginPopup from "@/components/auth/LoginPopup";
import { useAuth } from "@/lib/auth";
import { toggleWishlist } from "@/lib/firestore";

/**
 * StarRatingInline — Hiển thị sao đánh giá nhỏ gọn.
 * @param {{ rating: number, count: number }} props
 */
function StarRatingInline({ rating = 0, count = 0 }) {
  return (
    <div className="flex items-center gap-1">
      <svg className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="font-semibold text-gray-900">{rating.toFixed(1)}</span>
      {count > 0 && <span className="text-gray-400">({count})</span>}
    </div>
  );
}

/**
 * ShareButton — Share URL qua Web Share API hoặc copy clipboard.
 * @param {{ url: string, title: string }} props
 */
export function ShareButton({ url, title }) {
  const [copied, setCopied] = useState(false);

  /**
   * Xử lý share: dùng Web Share API nếu có, fallback copy clipboard.
   */
  const handleShare = useCallback(async () => {
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

    // Web Share API (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: title || "Khách sạn 9Trip", url: shareUrl });
        return;
      } catch {
        // User cancelled or API failed — fall through to copy
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort — select text manually
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url, title]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-white transition-colors"
      title={copied ? "Đã sao chép!" : "Chia sẻ"}
      aria-label={copied ? "Đã sao chép liên kết" : "Chia sẻ khách sạn"}
    >
      {copied ? (
        <>
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600 text-xs">Đã sao chép</span>
        </>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      )}
    </button>
  );
}

/**
 * WishlistButton — Nút yêu thích (heart) với toggle.
 * Nếu chưa login → hiện LoginPopup.
 * @param {{ hotelId: string }} props
 */
export function WishlistButton({ hotelId }) {
  const { user, profile } = useAuth();
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Sync wishlist state từ profile
  useEffect(() => {
    if (profile?.wishlist) {
      setIsWishlisted(profile.wishlist.includes(hotelId));
    }
  }, [profile, hotelId]);

  /**
   * Toggle wishlist: thêm/xóa khỏi danh sách yêu thích.
   */
  const handleToggle = useCallback(async () => {
    if (!user) {
      setShowLoginPopup(true);
      return;
    }
    if (toggling) return;
    setToggling(true);
    try {
      const adding = !isWishlisted;
      await toggleWishlist(user.uid, hotelId, adding);
      setIsWishlisted(adding);
    } catch (err) {
      console.error("[WishlistButton] Toggle failed:", err);
    } finally {
      setToggling(false);
    }
  }, [user, hotelId, isWishlisted, toggling]);

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={toggling}
        className={`flex items-center gap-1.5 rounded-xl backdrop-blur-sm px-3 py-1.5 text-sm font-medium shadow-sm transition-all ${
          isWishlisted
            ? "bg-red-50/90 text-red-500 hover:bg-red-100"
            : "bg-white/90 text-gray-600 hover:bg-white hover:text-red-500"
        }`}
        title={isWishlisted ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
        aria-label={isWishlisted ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      >
        <svg
          className={`h-4 w-4 transition-colors ${isWishlisted ? "fill-current" : "fill-none"}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
        {isWishlisted ? "Đã lưu" : "Lưu"}
      </button>
      <LoginPopup open={showLoginPopup} onClose={() => setShowLoginPopup(false)} />
    </>
  );
}

/**
 * ReviewSummaryCompact — Tổng quan đánh giá nhỏ gọn.
 * @param {{ reviews: Array<Object>, avgRating: number, totalRating: number }} props
 */
export function ReviewSummaryCompact({ reviews = [], avgRating = 0, totalRating = 0 }) {
  if (totalRating === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
        <svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm">Chưa có đánh giá</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-8">
      {/* Big score */}
      <div className="text-center mb-4">
        <span className="text-5xl font-bold text-primary">{avgRating.toFixed(1)}</span>
        <p className="text-sm text-gray-500 mt-1">{totalRating} đánh giá</p>
      </div>

      {/* Star distribution bars */}
      <div className="w-full max-w-xs space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = reviews.filter((r) => Math.round(r.rating) === star).length;
          const pct = totalRating > 0 ? (count / totalRating) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-right text-gray-500">{star}</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-gray-400 text-right">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Recent review snippets */}
      {reviews.length > 0 && (
        <div className="w-full mt-4 space-y-2 max-h-[120px] overflow-y-auto">
          {reviews.slice(0, 2).map((review, i) => (
            <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1 mb-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <svg
                    key={s}
                    className={`h-3 w-3 ${s < Math.round(review.rating) ? "text-yellow-400 fill-current" : "text-gray-300 fill-current"}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="line-clamp-2">{review.comment || review.text || ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * HotelHeader — header cho trang chi tiết khách sạn.
 * Bao gồm: gallery photos full-width, star/score badges overlay,
 * tên khách sạn, sao, địa chỉ, excerpt.
 * (Gallery tabs and action buttons removed — map/reviews moved to sidebar,
 * action buttons moved to HotelDetailClient)
 *
 * @param {{
 *   hotel: object,
 *   avgRating?: number,
 *   totalRating?: number,
 * }} props
 */
const HotelHeader = function HotelHeader({ hotel, avgRating = 0, totalRating = 0 }) {
  const {
    name,
    featuredImage,
    gallery = [],
    starRating = 0,
    address = {},
    excerpt,
    rating,
  } = hotel;

  const allImages = featuredImage ? [featuredImage, ...gallery] : gallery;
  const displayRating = avgRating || rating?.average || 0;
  const displayTotal = totalRating || rating?.count || 0;

  // Score label helper
  const getScoreLabel = (score) => {
    if (score >= 9) return "Tuyệt vời";
    if (score >= 8) return "Rất tốt";
    if (score >= 7) return "Tốt";
    if (score >= 6) return "Khá";
    return "Trung bình";
  };

  return (
    <div className="bg-white">
      {/* ── Gallery Section (full-width photos) ────────────── */}
      <div className="w-full">
        <div className="relative w-full bg-gray-100">
          {/* ── Gallery Content ─────────────────────────────── */}
          <div className="aspect-[16/9] md:aspect-[21/9] max-h-[60vh] relative">
            <ImageCarousel
              images={allImages}
              alt={name}
              aspectRatio="aspect-[16/9] md:aspect-[21/9]"
              showOverlay={false}
              serviceId={hotel.id}
              serviceType="hotel"
            />

            {/* ── Star badge top-left ──────────────────────── */}
            {starRating > 0 && (
              <span className="absolute top-3 left-3 z-10 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-yellow-600 shadow-sm flex items-center gap-1">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {starRating} sao
              </span>
            )}

            {/* ── Score badge top-right ─────────────────────── */}
            {displayRating > 0 && (
              <div className="absolute top-3 right-3 z-10 flex flex-col items-center rounded-xl bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-sm">
                <span className="text-lg font-bold text-primary">{displayRating.toFixed(1)}</span>
                <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap">
                  {getScoreLabel(displayRating)}
                </span>
              </div>
            )}

            {/* ── Photo count indicator ──────────────────────── */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 right-4 z-20 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5">
                {allImages.length} ảnh
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Title & Meta ────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{name}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              {address.city && (
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {[address.street, address.city, address.country].filter(Boolean).join(", ")}
                </div>
              )}
              {displayRating > 0 && (
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="text-gray-300">|</span>
                  <StarRatingInline rating={displayRating} count={displayTotal} />
                </div>
              )}
            </div>

            {excerpt && (
              <p className="text-gray-600 mt-3 line-clamp-2 max-w-2xl">{excerpt}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(HotelHeader);
