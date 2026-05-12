import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import StarRating from "@/components/shared/StarRating";
import PriceDisplay from "@/components/shared/PriceDisplay";
import { BLUR_DATA_URL } from "@/lib/constants";

/**
 * Helper to get amenities icons from included array
 * @param {string[]} included
 * @returns {Array<{icon: string, label: string}>}
 */
function getAmenitiesIcons(included = []) {
  if (!included || !included.length) return [];
  
  const icons = [];
  const added = new Set();
  
  for (const item of included) {
    const lower = item.toLowerCase();
    let icon = "";
    
    if (lower.includes("xe") || lower.includes("đưa đón")) icon = "🚌";
    else if (lower.includes("ăn") || lower.includes("bữa")) icon = "🍽️";
    else if (lower.includes("vé") || lower.includes("cổng")) icon = "🎫";
    else if (lower.includes("khách sạn") || lower.includes("nghỉ")) icon = "🏨";
    else if (lower.includes("hướng dẫn")) icon = "🗣️";
    else if (lower.includes("bảo hiểm")) icon = "🛡️";
    else if (lower.includes("chụp") || lower.includes("ảnh")) icon = "📸";
    
    if (icon && !added.has(icon)) {
      icons.push({ icon, label: item });
      added.add(icon);
    }
    
    if (icons.length >= 3) break;
  }
  
  return icons;
}

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
    rating,
    included = [],
    locationName,
    location = locationName,
    excerpt,
    durationDays,
    isFeatured,
    discountPercent,
  } = tour;

  const discountPct =
    discountPercent ||
    (pricing.discount > 0 && pricing.adultPrice
      ? Math.round((pricing.discount / pricing.adultPrice) * 100)
      : 0);

  const durDays = duration.days || durationDays || 0;
  const durationText = durDays
    ? `${durDays} ngày ${duration.nights || durDays - 1 || 0} đêm`
    : "";

  const avgRating = rating?.average || ratingAverage || 0;
  const reviewCount = rating?.count || ratingCount || 0;
  const amenities = getAmenitiesIcons(included);

  if (variant === "list") {
    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow",
          className
        )}
      >
        <Link href={`/tours/${slug}`} className="relative h-48 sm:h-auto sm:w-64 flex-shrink-0 overflow-hidden rounded-lg" data-service-type="tour" data-service-id={id}>
          <Image
            src={featuredImage || "/placeholder.jpg"}
            alt={title}
            fill
            className="object-cover"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="256px"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {isFeatured && (
              <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
                Nổi bật
              </span>
            )}
            {discountPct > 0 && (
              <span className="rounded bg-rose-600 px-2 py-1 text-xs font-bold text-white">
                Giá tốt nhất
              </span>
            )}
          </div>
        </Link>
        <div className="flex flex-1 flex-col justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {location && <span>{location}</span>}
              {durationText && <span>• {durationText}</span>}
            </div>
            <Link href={`/tours/${slug}`}>
              <h3 className="text-lg font-semibold text-foreground hover:text-primary line-clamp-2">
                {title}
              </h3>
            </Link>
            {amenities.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {amenities.map((amenity, idx) => (
                  <span key={idx} title={amenity.label} className="text-sm cursor-help">
                    {amenity.icon}
                  </span>
                ))}
              </div>
            )}
            {excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{excerpt}</p>}
          </div>
          <div className="flex items-center justify-between">
            {avgRating > 0 ? (
              <StarRating rating={avgRating} count={reviewCount} size="sm" variant="compact" />
            ) : (
              <span className="text-xs text-muted-foreground">Chưa có đánh giá</span>
            )}
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
        "group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow",
        className
      )}
    >
      <Link href={`/tours/${slug}`} className="relative block aspect-[4/3] overflow-hidden" data-service-type="tour" data-service-id={id}>
        <Image
          src={featuredImage || "/placeholder.jpg"}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {isFeatured && (
            <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
              Nổi bật
            </span>
          )}
          {discountPct > 0 && (
            <span className="rounded bg-rose-600 px-2 py-1 text-xs font-bold text-white">
              Giá tốt nhất
            </span>
          )}
        </div>
        {discountPct > 0 && (
          <span className="absolute top-2 right-2 rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            -{discountPct}%
          </span>
        )}
      </Link>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {location && <span>{location}</span>}
          {durationText && <span>• {durationText}</span>}
        </div>
        <Link href={`/tours/${slug}`}>
          <h3 className="font-semibold text-foreground hover:text-primary line-clamp-2 mb-2 min-h-[2.5rem]">
            {title}
          </h3>
        </Link>
        {amenities.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            {amenities.map((amenity, idx) => (
              <span key={idx} title={amenity.label} className="text-sm cursor-help">
                {amenity.icon}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          {avgRating > 0 ? (
            <StarRating rating={avgRating} count={reviewCount} size="sm" variant="compact" />
          ) : (
            <span className="text-xs text-muted-foreground">Chưa có đánh giá</span>
          )}
          <PriceDisplay price={pricing.adultPrice || 0} discountPercent={discountPct} showPerPerson size="sm" />
        </div>
      </div>
    </div>
  );
}