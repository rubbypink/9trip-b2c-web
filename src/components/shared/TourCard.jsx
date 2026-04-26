/**
 * TourCard - Card hiển thị tour dạng grid.
 * @param {{ tour: object, variant?: 'grid' | 'list' }} props
 */
import Link from "next/link";
import StarRating from "./StarRating";
import PriceDisplay from "./PriceDisplay";

export default function TourCard({ tour, variant = "grid" }) {
  if (variant === "list") {
    return (
      <div className="flex gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <Link href={`/tours/${tour.slug}`} className="shrink-0 w-60 h-44 rounded-lg overflow-hidden">
          <img
            src={tour.featuredImage || "/placeholder-tour.jpg"}
            alt={tour.title}
            className="w-full h-full object-cover"
          />
        </Link>
        <div className="flex flex-col flex-1 min-w-0">
          <Link href={`/tours/${tour.slug}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-2">
            {tour.title}
          </Link>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{tour.excerpt}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span>📍 {tour.locationName || "Đang cập nhật"}</span>
            <span>⏱️ {tour.duration?.days}N{tour.duration?.nights - 1}Đ</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={tour.ratingAverage} />
            <span className="text-xs text-gray-400">({tour.ratingCount} đánh giá)</span>
          </div>
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
            <PriceDisplay price={tour.pricing?.adultPrice} discount={tour.pricing?.discount} currency={tour.pricing?.currency} />
            <Link href={`/tours/${tour.slug}`} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/tours/${tour.slug}`} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={tour.featuredImage || "/placeholder-tour.jpg"}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {tour.pricing?.discount > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{tour.pricing.discount}%
          </span>
        )}
        {tour.isFeatured && (
          <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Nổi bật
          </span>
        )}
      </Link>
      <div className="p-4">
        <Link href={`/tours/${tour.slug}`} className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 mb-1">
          {tour.title}
        </Link>
        <p className="text-xs text-gray-500 mb-2">📍 {tour.locationName || "Đang cập nhật"}</p>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <span>⏱️ {tour.duration?.days}N{tour.duration?.nights - 1}Đ</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <StarRating rating={tour.ratingAverage} size="sm" />
          <span className="text-xs text-gray-400">({tour.ratingCount})</span>
        </div>
        <div className="flex items-center justify-between">
          <PriceDisplay price={tour.pricing?.adultPrice} discount={tour.pricing?.discount} currency={tour.pricing?.currency} size="sm" />
          <Link href={`/tours/${tour.slug}`} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}