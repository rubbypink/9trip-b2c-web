import Link from "next/link";
import Image from "next/image";
import StarRating from "./StarRating";
import PriceDisplay from "./PriceDisplay";
import { BLUR_DATA_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const AMENITY_ICONS = {
  "wifi": "📶",
  "internet": "📶",
  "hồ bơi": "🏊",
  "bể bơi": "🏊",
  "nhà hàng": "🍽️",
  "restaurant": "🍽️",
  "spa": "💆",
  "massage": "💆",
  "gym": "🏋️",
  "phòng tập": "🏋️",
  "đỗ xe": "🅿️",
  "parking": "🅿️",
  "bar": "🍸",
  "quầy bar": "🍸",
  "lễ tân": "🕐",
  "24h": "🕐",
  "điều hòa": "❄️",
  "máy lạnh": "❄️"
};

/**
 * Lấy icon tương ứng với tiện ích
 * @param {string} amenity 
 * @returns {string}
 */
function getAmenityIcon(amenity) {
  if (!amenity) return "🏨";
  const lower = amenity.toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "🏨";
}

/**
 * HotelCard - Card hiển thị khách sạn dạng grid.
 * Hiển thị giá thấp nhất nếu có pricing data, fallback về hotel.pricing.basePrice.
 * @param {{ hotel?: object, item?: object, isFeatured?: boolean, className?: string }} props
 */
export default function HotelCard({ hotel, item, isFeatured = false, className }) {
  const data = hotel || item;
  if (!data) return null;

  const stars = Array.from({ length: data.starRating || 0 }, () => '⭐');

  // Ưu tiên lowestPrice từ pricing data, fallback về basePrice
  const displayPrice = data.lowestPrice || data.pricing?.basePrice || data.pricing?.adultPrice || data.minPrice || 0;
  
  const hasDiscount = data.pricing?.discountPercent > 0 || (data.lowestPrice && data.lowestPrice < data.pricing?.basePrice);

  const amenities = Array.isArray(data.amenities) ? data.amenities.slice(0, 3) : [];

  const ratingAvg = data.ratingAverage || data.rating?.average || data.starRating || 0;
  const ratingCount = data.ratingCount || data.rating?.count || 0;

  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group flex flex-col", className)}>
      <Link href={`/hotels/${data.slug}`} className="block relative aspect-[4/3] overflow-hidden shrink-0" data-service-type="hotel" data-service-id={data.id}>
        <Image
          src={data.featuredImage || "/placeholder-hotel.jpg"}
          alt={data.name || data.title || "Hotel"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            {hasDiscount && (
              <span className="bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                Giá tốt nhất
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            {(isFeatured || data.isFeatured) && (
              <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                Nổi bật
              </span>
            )}
          </div>
        </div>
      </Link>
      
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <div className="text-xs">{stars.join("")}</div>
          {amenities.length > 0 && (
            <div className="flex gap-1">
              {amenities.map((amenity, idx) => (
                <span key={idx} title={amenity} className="text-sm cursor-help">
                  {getAmenityIcon(amenity)}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <Link href={`/hotels/${data.slug}`}>
          <h3 className="font-semibold text-foreground hover:text-primary-600 line-clamp-2 mb-1 min-h-[2.5rem]">
            {data.name || data.title}
          </h3>
        </Link>
        
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
          📍 {data.locationName || data.address?.city || "Phú Quốc"}
        </p>
        
        <div className="flex items-center gap-1 mb-3 h-5">
          {ratingAvg > 0 ? (
            <StarRating rating={ratingAvg} count={ratingCount} size="sm" variant="compact" />
          ) : data.starRating ? (
            <span className="text-xs text-muted-foreground">{data.starRating} sao</span>
          ) : (
            <span className="text-xs text-muted-foreground italic">Chưa có đánh giá</span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          <PriceDisplay
            price={displayPrice}
            childPrice={data.pricing?.childPrice}
            currency="VND"
            size="sm"
            label="Từ "
          />
          <Link href={`/hotels/${data.slug}`} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors shrink-0 ml-2">
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
