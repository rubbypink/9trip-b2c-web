/**
 * Testimonials / ReviewsCarousel — Section hiển thị đánh giá từ khách hàng.
 * Hiển thị dạng grid card với avatar, tên, rating, nội dung.
 *
 * @param {{ reviews: Array<{id: string, userName: string, userAvatar?: string, rating: number, title?: string, content: string}> }} props
 */
export default function Testimonials({ reviews }) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Khách hàng nói gì về 9Trip
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Hàng nghìn khách hàng đã tin tưởng và có những trải nghiệm tuyệt vời cùng chúng tôi
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.slice(0, 6).map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-5 h-5 ${
                      star <= review.rating ? "text-yellow-400" : "text-gray-200"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-600 leading-relaxed mb-4 line-clamp-4">
                &ldquo;{review.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <img
                  src={review.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}&background=3b82f6&color=fff`}
                  alt={review.userName}
                  className="w-10 h-10 rounded-full object-cover"
                  loading="lazy"
                />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {review.userName}
                  </p>
                  {review.title && (
                    <p className="text-xs text-gray-400">{review.title}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}