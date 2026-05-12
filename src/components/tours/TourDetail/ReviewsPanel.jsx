"use client";

import { useState } from "react";
import StarRating from "@/components/shared/StarRating";
import { cn } from "@/lib/utils";

/**
 * ReviewsPanel — hiển thị danh sách đánh giá + rating summary.
 * @param {{
 *   ratingAverage: number,
 *   ratingCount: number,
 *   reviews: Array<{ id: string, userName: string, userAvatar?: string, rating: number, title?: string, content: string, createdAt: string }>,
 * }} props
 */
export default function ReviewsPanel({ ratingAverage = 0, ratingCount = 0, reviews = [] }) {
  const [visibleCount, setVisibleCount] = useState(5);

  // Rating distribution (giả lập nếu không có từ server)
  const distribution = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1]++;
  });
  const totalReviews = ratingCount || reviews.length;

  if (totalReviews === 0) {
    return (
      <div className="text-center py-10">
        <svg className="h-12 w-12 mx-auto text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <p className="text-muted-foreground text-sm">Chưa có đánh giá nào cho tour này.</p>
      </div>
    );
  }

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < totalReviews;

  return (
    <div>
      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 rounded-xl border border-border bg-surface-1/50">
        {/* Average score */}
        <div className="text-center">
          <div className="text-4xl font-bold text-foreground">{(Number(ratingAverage) || 0).toFixed(1)}</div>
          <StarRating rating={ratingAverage} size="sm" className="mt-1 justify-center" />
          <p className="text-sm text-muted-foreground mt-1">{totalReviews} đánh giá</p>
        </div>

        {/* Distribution bars */}
        <div className="md:col-span-2 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1];
            const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-right text-muted-foreground">{star}</span>
                <svg className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Items */}
      {visibleReviews.length > 0 ? (
        <div className="space-y-4">
          {visibleReviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground overflow-hidden">
                  {review.userAvatar ? (
                    <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                  ) : (
                    review.userName?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground text-sm">{review.userName}</div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size="xs" />
                    {review.createdAt && (
                      <span className="text-xs text-muted-foreground">{review.createdAt}</span>
                    )}
                  </div>
                </div>
              </div>
              {review.title && (
                <h4 className="font-semibold text-foreground mb-1.5">{review.title}</h4>
              )}
              {review.content && (
                <p className="text-sm text-muted-foreground line-clamp-4">{review.content}</p>
              )}
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-surface-1 transition-colors"
              >
                Xem thêm ({totalReviews - visibleCount} đánh giá)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <p>Chưa có đánh giá nào cho tour này.</p>
        </div>
      )}
    </div>
  );
}