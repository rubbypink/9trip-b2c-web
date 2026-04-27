import Link from "next/link";

/**
 * Format giá tiền VND.
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
  if (price == null) return "Liên hệ";
  return price.toLocaleString("vi-VN") + "₫";
}

/**
 * TourCard — Hiển thị thông tin tour dạng card.
 * @param {{ tour: Object, className?: string }} props
 */
export default function TourCard({ tour, className = "" }) {
  const imageUrl = tour.media?.[0] || "/placeholder-tour.jpg";
  const locationName = tour.locationName || tour.locationId || "Địa điểm";
  const rating = tour.ratingAverage || null;
  const reviewCount = tour.reviewCount || 0;
  const adultPrice = tour.pricing?.adultPrice;
  const discount = tour.pricing?.discount;
  const duration = tour.duration || "3N2Đ";
  const slug = tour.slug || tour.id;

  return (
    <Link
      href={`/tour/${slug}`}
      className={`group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-blue-100 transition-all duration-300 ${className}`}
    >
      {/* Ảnh & Badge */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={tour.name || tour.title || "Tour"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {discount && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{discount}%
          </span>
        )}
        <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-2 py-1 rounded-full">
          {duration}
        </span>
      </div>

      {/* Nội dung */}
      <div className="p-4">
        {/* Địa điểm */}
        <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {locationName}
        </p>

        {/* Tên tour */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mt-1 mb-2 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
          {tour.name || tour.title || "Tour du lịch"}
        </h3>

        {/* Đánh giá */}
        {rating && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviewCount})</span>
          </div>
        )}

        {/* Giá */}
        <div className="flex items-baseline gap-1 pt-2 border-t border-gray-50">
          {adultPrice ? (
            <>
              <span className="text-base font-bold text-red-500">{formatPrice(adultPrice)}</span>
              <span className="text-xs text-gray-400">/người</span>
            </>
          ) : (
            <span className="text-sm text-gray-400 italic">{formatPrice(null)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}