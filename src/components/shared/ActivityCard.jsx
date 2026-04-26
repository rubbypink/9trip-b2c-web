/**
 * ActivityCard - Card hiển thị activity dạng grid.
 * @param {{ activity: object }} props
 */
import Link from "next/link";
import StarRating from "./StarRating";
import PriceDisplay from "./PriceDisplay";

export default function ActivityCard({ activity }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/activities/${activity.slug}`} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={activity.featuredImage || "/placeholder-activity.jpg"}
          alt={activity.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {activity.pricing?.discount > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{activity.pricing.discount}%
          </span>
        )}
      </Link>
      <div className="p-4">
        <Link href={`/activities/${activity.slug}`} className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 mb-1">
          {activity.title}
        </Link>
        <p className="text-xs text-gray-500 mb-2">📍 {activity.locationName || "Đang cập nhật"}</p>
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <span>⏱️ {activity.duration?.hours}h{activity.duration?.minutes > 0 ? `${activity.duration.minutes}p` : ""}</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <StarRating rating={activity.ratingAverage} size="sm" />
          <span className="text-xs text-gray-400">({activity.ratingCount})</span>
        </div>
        <div className="flex items-center justify-between">
          <PriceDisplay price={activity.pricing?.adultPrice} discount={activity.pricing?.discount} currency="VND" size="sm" />
          <Link href={`/activities/${activity.slug}`} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}