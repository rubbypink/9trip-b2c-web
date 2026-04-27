/**
 * HotelCard - Card hiển thị khách sạn dạng grid.
 * @param {{ hotel: object }} props
 */
import Link from "next/link";
import StarRating from "./StarRating";
import PriceDisplay from "./PriceDisplay";

export default function HotelCard({ hotel, item }) {
  const data = hotel || item;
  const stars = [];
  for (let i = 0; i < (data.starRating || 0); i++) {
    stars.push("⭐");
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/hotels/${data.slug}`} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={data.featuredImage || "/placeholder-hotel.jpg"}
          alt={data.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {data.isFeatured && (
          <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Nổi bật
          </span>
        )}
      </Link>
      <div className="p-4">
        <div className="text-xs mb-1">{stars.join("")}</div>
        <Link href={`/hotels/${data.slug}`} className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 mb-1">
          {data.title}
        </Link>
        <p className="text-xs text-gray-500 mb-2">📍 {data.locationName || data.address || "Đang cập nhật"}</p>
        <div className="flex items-center gap-1 mb-3">
          <StarRating rating={data.ratingAverage} size="sm" />
          <span className="text-xs text-gray-400">({data.ratingCount})</span>
        </div>
        <div className="flex items-center justify-between">
          <PriceDisplay
            price={data.pricing?.basePrice || data.pricing?.adultPrice || data.minPrice || 0}
            childPrice={data.pricing?.childPrice}
            currency="VND"
            size="sm"
            label="Từ "
          />
          <Link href={`/hotels/${data.slug}`} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}