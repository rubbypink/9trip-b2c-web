/**
 * TourCard - Card hiển thị tour dạng grid.
 * @param {{ tour: object, variant?: 'grid' | 'list' }} props
 */
import Link from "next/link";
import Image from "next/image";
import StarRating from "./StarRating";
import PriceDisplay from "./PriceDisplay";

export default function TourCard({ tour, item, variant = "grid" }) {
  const data = tour || item;
  if (variant === "list") {
    return (
      <div className="flex gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <Link href={`/tours/${data.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 w-60 h-44 rounded-lg overflow-hidden relative" data-service-type="tour" data-service-id={data.id}>
          <Image
            src={data.featuredImage || "/placeholder-tour.jpg"}
            alt={data.title}
            fill
            className="object-cover"
            sizes="240px"
            onError={(e) => { e.currentTarget.src = "/placeholder-tour.jpg"; }}
          />
        </Link>
        <div className="flex flex-col flex-1 min-w-0">
          <Link href={`/tours/${data.slug}`} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-2">
            {data.title}
          </Link>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{data.excerpt}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span>📍 {data.locationName || "Đang cập nhật"}</span>
            <span>⏱️ {data.duration?.days}N{data.duration?.nights - 1}Đ</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={data.ratingAverage} />
            <span className="text-xs text-gray-400">({data.ratingCount} đánh giá)</span>
          </div>
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
            <PriceDisplay
              price={data.pricing?.adultPrice || 0}
              childPrice={data.pricing?.childPrice}
              discount={data.pricing?.discountPercent || data.pricing?.discount}
              currency={data.pricing?.currency || "VND"}
            />
            <Link href={`/tours/${data.slug}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/tours/${data.slug}`} target="_blank" rel="noopener noreferrer" className="block relative aspect-[4/3] overflow-hidden" data-service-type="tour" data-service-id={data.id}>
        <Image
          src={data.featuredImage || "/placeholder-tour.jpg"}
          alt={data.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={(e) => { e.currentTarget.src = "/placeholder-tour.jpg"; }}
        />
        {data.pricing?.discountPercent > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{data.pricing.discountPercent}%
          </span>
        )}
        {!data.pricing?.discountPercent && data.discountPercent > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{data.discountPercent}%
          </span>
        )}
        {data.isFeatured && (
          <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Nổi bật
          </span>
        )}
      </Link>
      <div className="p-4">
        <Link href={`/tours/${data.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 mb-1 min-h-[2.5rem]">
          {data.title}
        </Link>
        <p className="text-xs text-gray-500 mb-2">📍 {data.locationName || "Đang cập nhật"}</p>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <span>⏱️ {data.duration?.days}N{data.duration?.nights - 1}Đ</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <StarRating rating={data.ratingAverage} size="sm" />
          <span className="text-xs text-gray-400">({data.ratingCount})</span>
        </div>
        <div className="flex items-center justify-between">
          <PriceDisplay
            price={data.pricing?.adultPrice || 0}
            childPrice={data.pricing?.childPrice}
            discount={data.pricing?.discountPercent || data.pricing?.discount}
            currency={data.pricing?.currency || "VND"}
            size="sm"
          />
          <Link href={`/tours/${data.slug}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
