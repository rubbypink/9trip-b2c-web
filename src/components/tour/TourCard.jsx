import Link from "next/link";
import Image from "next/image";

/**
 * TourCard — Hiển thị thông tin tour dạng card.
 * Sử dụng Next.js Image để tối ưu ảnh. Mở link trong tab mới.
 *
 * @param {{ tour: Object, className?: string }} props
 */
export default function TourCard({ tour, className = "" }) {
  const {
    id,
    title = "Tour du lịch",
    slug,
    featuredImage,
    pricing = {},
    ratingAverage,
    ratingCount = 0,
    locationName,
    duration = {},
    discountPercent,
  } = tour;

  const imageUrl = featuredImage || "/placeholder-tour.jpg";
  const locName = locationName || "Địa điểm";
  const adultPrice = pricing?.adultPrice;
  const discountPct = discountPercent || pricing?.discountPercent || 0;
  const durationText = duration?.days
    ? `${duration.days}N${duration?.nights || duration.days - 1 || 0}Đ`
    : duration || "";

  /**
   * Format giá tiền VND.
   * @param {number} price
   * @returns {string}
   */
  const formatPrice = (price) => {
    if (price == null) return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };

  return (
    <Link
      href={`/tours/${slug || id}`}
      target="_blank"
      rel="noopener noreferrer"
      data-service-type="tour"
      data-service-id={id}
      className={`group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-blue-100 transition-all duration-300 ${className}`}
    >
      {/* Ảnh & Badge */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        {discountPct > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
            -{discountPct}%
          </span>
        )}
        {durationText && (
          <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-2 py-1 rounded-full z-10">
            {durationText}
          </span>
        )}
      </div>

      {/* Nội dung */}
      <div className="p-4">
        {/* Địa điểm */}
        <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{locName}</span>
        </p>

        {/* Tên tour */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mt-1 mb-2 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
          {title}
        </h3>

        {/* Đánh giá */}
        {ratingAverage != null && ratingAverage > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-xs font-medium text-gray-700">{Number(ratingAverage).toFixed(1)}</span>
            {ratingCount > 0 && (
              <span className="text-xs text-gray-400">({ratingCount})</span>
            )}
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