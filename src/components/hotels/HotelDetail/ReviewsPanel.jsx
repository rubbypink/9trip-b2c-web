import ReviewCard from "@/components/shared/ReviewCard";

/**
 * ReviewsPanel — Danh sách đánh giá + breakdown.
 * @param {{ reviews?: Array<Object>, avgRating?: number, totalRating?: number }} props
 */
export default function ReviewsPanel({ reviews = [], avgRating = 0, totalRating = 0 }) {
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        <svg className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="font-medium text-gray-700">Chưa có đánh giá</p>
        <p className="text-sm text-gray-400 mt-1">Hãy là người đầu tiên đánh giá khách sạn này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{avgRating.toFixed(1)}</div>
            <div className="text-sm text-gray-500 mt-1">{totalRating} đánh giá</div>
          </div>
          <div className="flex-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => Math.round(r.rating) === star).length;
              const pct = totalRating > 0 ? (count / totalRating) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-right text-gray-500">{star}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-gray-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
