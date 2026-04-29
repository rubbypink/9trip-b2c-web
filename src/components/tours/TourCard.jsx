import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import StarRating from "@/components/shared/StarRating";
import PriceDisplay from "@/components/shared/PriceDisplay";

/**
 * TourCard — card tour cho grid/list view.
 * @param {{ tour?: object, item?: object, variant?: 'grid' | 'list', className?: string }} props
 */
export default function TourCard({ tour: tourProp, item, variant = "grid", className }) {
  const tour = tourProp || item;
  const {
    id,
    title = "Untitled Tour",
    slug = "#",
    featuredImage,
    pricing = {},
    duration = {},
    ratingAverage = 0,
    ratingCount = 0,
    locationName,
    excerpt,
    isFeatured,
    discountPercent,
  } = tour;

  const discountPct =
    discountPercent ||
    (pricing.discount > 0 && pricing.adultPrice
      ? Math.round((pricing.discount / pricing.adultPrice) * 100)
      : 0);

  const durationText = duration.days
    ? `${duration.days} ngày ${duration.nights || duration.days - 1 || 0} đêm`
    : "";

  if (variant === "list") {
    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow",
          className
        )}
      >
        <Link href={`/tours/${slug}`} target="_blank" rel="noopener noreferrer" className="relative h-48 sm:h-auto sm:w-64 flex-shrink-0 overflow-hidden rounded-lg" data-service-type="tour" data-service-id={id}>
          <Image
            src={featuredImage || "/placeholder.jpg"}
            alt={title}
            fill
            className="object-cover"
            sizes="256px"
          />
          {isFeatured && (
            <span className="absolute top-2 left-2 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
              Nổi bật
            </span>
          )}
        </Link>
        <div className="flex flex-1 flex-col justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              {locationName && <span>{locationName}</span>}
              {durationText && <span>• {durationText}</span>}
            </div>
            <Link href={`/tours/${slug}`} target="_blank" rel="noopener noreferrer">
              <h3 className="text-lg font-semibold text-gray-900 hover:text-primary line-clamp-2">
                {title}
              </h3>
            </Link>
            {excerpt && <p className="text-sm text-gray-500 line-clamp-2 mt-1">{excerpt}</p>}
          </div>
          <div className="flex items-center justify-between">
            <StarRating rating={ratingAverage} showCount reviewCount={ratingCount} size="sm" />
            <PriceDisplay price={pricing.adultPrice || 0} discountPercent={discountPct} showPerPerson />
          </div>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div
      className={cn(
        "group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow",
        className
      )}
    >
      <Link href={`/tours/${slug}`} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/3] overflow-hidden" data-service-type="tour" data-service-id={id}>
        <Image
          src={featuredImage || "/placeholder.jpg"}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {isFeatured && (
          <span className="absolute top-2 left-2 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
            Nổi bật
          </span>
        )}
        {discountPct > 0 && (
          <span className="absolute top-2 right-2 rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            -{discountPct}%
          </span>
        )}
      </Link>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          {locationName && <span>{locationName}</span>}
          {durationText && <span>• {durationText}</span>}
        </div>
        <Link href={`/tours/${slug}`} target="_blank" rel="noopener noreferrer">
          <h3 className="font-semibold text-gray-900 hover:text-primary line-clamp-2 mb-2 min-h-[2.5rem]">
            {title}
          </h3>
        </Link>
        <div className="flex items-center justify-between">
          <StarRating rating={ratingAverage} size="sm" />
          <PriceDisplay price={pricing.adultPrice || 0} discountPercent={discountPct} showPerPerson size="sm" />
        </div>
      </div>
    </div>
  );
}