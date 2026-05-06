/**
 * ActivityCard - Card hiển thị activity dạng grid.
 * @param {{ activity: object }} props
 */
import Link from "next/link";
import Image from "next/image";
import StarRating from "./StarRating";
import PriceDisplay from "./PriceDisplay";
import { BLUR_DATA_URL } from "@/lib/constants";

export default function ActivityCard({ activity, item }) {
  const data = activity || item;
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow group">
      <Link href={`/activities/${data.slug}`} className="block relative aspect-[4/3] overflow-hidden" data-service-type="activity" data-service-id={data.id}>
        <Image
          src={data.featuredImage || "/placeholder-activity.jpg"}
          alt={data.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
      </Link>
      <div className="p-4">
        <Link href={`/activities/${data.slug}`} className="font-semibold text-foreground hover:text-primary-600 line-clamp-2 mb-1 min-h-[2.5rem]">
          {data.title}
        </Link>
        <p className="text-xs text-muted-foreground mb-2">📍 {data.locationName || "Phú Quốc"}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <span>⏱️ {data.duration?.hours || "4-8"}h{data.duration?.minutes > 0 ? `${data.duration.minutes}p` : ""}</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <StarRating rating={data.ratingAverage} size="sm" />
          <span className="text-xs text-muted-foreground">({data.ratingCount})</span>
        </div>
        <div className="flex items-center justify-between">
          <PriceDisplay
            price={data.pricing?.adultPrice || data.pricing?.basePrice || 0}
            childPrice={data.pricing?.childPrice}
            discount={data.pricing?.discountPercent || data.pricing?.discount}
            currency="VND"
            size="sm"
          />
          <Link href={`/activities/${data.slug}`} className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors">
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
