"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { createReview } from "@/lib/firestore";
import LoginPopup from "@/components/auth/LoginPopup";

/**
 * WriteReviewForm — Form cho phép người dùng viết đánh giá cho dịch vụ.
 * @param {{
 *   serviceId: string,
 *   serviceType: 'hotel' | 'tour' | 'activity' | 'car',
 *   onReviewSubmitted?: Function
 * }} props
 */
export default function WriteReviewForm({ serviceId, serviceType, onReviewSubmitted }) {
  const { user, profile } = useAuth();
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Handle form submission: add review to Firestore.
   */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!user) {
        setShowLoginPopup(true);
        return;
      }
      if (rating === 0) {
        setError("Vui lòng chọn số sao đánh giá.");
        return;
      }
      if (!comment.trim()) {
        setError("Vui lòng nhập nội dung đánh giá.");
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        const reviewData = {
          serviceId,
          serviceType,
          userId: user.uid,
          userName: profile?.displayName || user.displayName || "Khách hàng",
          rating,
          comment: comment.trim(),
          createdAt: new Date().toISOString(),
        };

        await createReview(reviewData);

        setSuccess(true);
        setRating(0);
        setComment("");
        if (onReviewSubmitted) {
          onReviewSubmitted(reviewData);
        }
      } catch (err) {
        console.error("[WriteReviewForm] Error:", err);
        setError("Không thể gửi đánh giá. Vui lòng thử lại sau.");
      } finally {
        setSubmitting(false);
      }
    },
    [user, profile, serviceId, serviceType, rating, comment, onReviewSubmitted]
  );

  if (!user) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <p className="text-muted-foreground text-sm mb-3">Vui lòng đăng nhập để viết đánh giá</p>
        <button
          type="button"
          onClick={() => setShowLoginPopup(true)}
          className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
        >
          Đăng nhập
        </button>
        <LoginPopup open={showLoginPopup} onClose={() => setShowLoginPopup(false)} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <svg className="h-12 w-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-semibold text-green-700">Cảm ơn bạn đã đánh giá!</p>
        <p className="text-sm text-green-600 mt-1">Đánh giá của bạn sẽ được hiển thị sau khi được duyệt.</p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-4 text-sm text-green-600 underline hover:text-green-700"
        >
          Viết đánh giá khác
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-foreground">Viết đánh giá của bạn</h3>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Đánh giá của bạn</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="text-2xl transition-colors"
              aria-label={`${star} sao`}
            >
              <svg
                className={`h-7 w-7 ${
                  star <= (hoveredStar || rating)
                    ? "text-yellow-400 fill-current"
                    : "text-muted-foreground fill-current"
                }`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating > 0 ? `${rating}/5 sao` : "Chọn sao"}
          </span>
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Nội dung đánh giá</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Chia sẻ trải nghiệm của bạn..."
          className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          maxLength={2000}
        />
        <div className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/2000</div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || rating === 0 || !comment.trim()}
        className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Đang gửi..." : "Gửi đánh giá"}
      </button>
    </form>
  );
}
