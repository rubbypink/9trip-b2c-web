import Link from "next/link";
import Image from "next/image";
import StarRating from "./StarRating";
import PriceDisplay from "./PriceDisplay";
import Badge from "@/components/shared/Badge";
import { BLUR_DATA_URL } from "@/lib/constants";

/**
 * HotelCard - Card hiển thị khách sạn dạng grid.
 * Hiển thị giá thấp nhất nếu có pricing data, fallback về hotel.pricing.basePrice.
 * @param {{ hotel?: object, item?: object }} props
 */
export default function HotelCard({ hotel, item }) {
  const data = hotel || item;
  const stars = [];
  for (let i = 0; i < (data.starRating || 0); i++) {
    stars.push("⭐");
  }

  // Ưu tiên lowestPrice từ pricing data, fallback về basePrice
  const displayPrice = data.lowestPrice || data.pricing?.basePrice || data.pricing?.adultPrice || data.minPrice || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/hotels/${data.slug}`} className="block relative aspect-[4/3] overflow-hidden" data-service-type="hotel" data-service-id={data.id}>
        <Image
          src={data.featuredImage || "/placeholder-hotel.jpg"}
          alt={data.name || data.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {data.isFeatured && (
          <Badge variant="warning" size="sm" className="absolute top-3 right-3">Nổi bật</Badge>
        )}
      </Link>
      <div className="p-4">
        <div className="text-xs mb-1">{stars.join("")}</div>
        <Link href={`/hotels/${data.slug}`} className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 mb-1 min-h-[2.5rem]">
          {data.name || data.title}
        </Link>
        <p className="text-xs text-gray-500 mb-2">📍 {data.locationName || data.address?.city || "Phú Quốc"}</p>
        <div className="flex items-center gap-1 mb-3">
          <StarRating rating={data.ratingAverage || data.rating?.average} size="sm" />
          <span className="text-xs text-gray-400">({data.ratingCount || data.rating?.count || 0})</span>
        </div>
        <div className="flex items-center justify-between">
          <PriceDisplay
            price={displayPrice}
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