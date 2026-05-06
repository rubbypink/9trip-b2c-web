import Link from "next/link";
import Image from "next/image";
import StarRating from "./StarRating";
import PriceDisplay from "./PriceDisplay";
import { BLUR_DATA_URL } from "@/lib/constants";

/**
 * Maps items from the `included` array to emoji icons for activity amenities.
 * Activities have no `amenities` field — this uses `included` instead.
 * @param {string[]} included - Array of included item descriptions
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
    else if (lower.includes("hướng dẫn")) icon = "🗣️";
    else if (lower.includes("bảo hiểm")) icon = "🛡️";
    else if (lower.includes("chụp") || lower.includes("ảnh")) icon = "📸";
    else icon = "✅";

    if (!added.has(icon)) {
      icons.push({ icon, label: item });
      added.add(icon);
    }

    if (icons.length >= 3) break;
  }

  return icons;
}

/**
 * ActivityCard — Card hiển thị activity dạng grid.
 * Hiển thị best price badge, amenities icons từ included[], và rating với fallbacks.
 * @param {{ activity?: object, item?: object }} props
 */
export default function ActivityCard({ activity, item }) {
  const data = activity || item;

  const {
    id,
    title = "Untitled Activity",
    slug = "#",
    featuredImage,
    pricing = {},
    duration = {},
    ratingAverage = 0,
    ratingCount = 0,
    rating,
    included = [],
    locationName,
    discountPercent,
  } = data;

  const discountPct =
    discountPercent ||
    (pricing.discountPercent > 0 ? pricing.discountPercent : 0);

  const avgRating = rating?.average || ratingAverage || 0;
  const reviewCount = rating?.count || ratingCount || 0;
  const amenities = getAmenitiesIcons(included);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow group">
      <Link
        href={`/activities/${slug}`}
        className="block relative aspect-[4/3] overflow-hidden"
        data-service-type="activity"
        data-service-id={id}
      >
        <Image
          src={featuredImage || "/placeholder-activity.jpg"}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {discountPct > 0 && (
          <span className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded">
            Giá tốt nhất
          </span>
        )}
      </Link>
      <div className="p-4">
        <Link
          href={`/activities/${slug}`}
          className="font-semibold text-foreground hover:text-primary-600 line-clamp-2 mb-1 min-h-[2.5rem]"
        >
          {title}
        </Link>
        <p className="text-xs text-muted-foreground mb-2">
          📍 {locationName || "Phú Quốc"}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <span>
            ⏱️ {duration.hours || "4-8"}h
            {duration.minutes > 0 ? `${duration.minutes}p` : ""}
          </span>
        </div>
        {amenities.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            {amenities.map((amenity, idx) => (
              <span key={idx} title={amenity.label} className="text-sm cursor-help">
                {amenity.icon}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 mb-3">
          {avgRating > 0 ? (
            <StarRating rating={avgRating} count={reviewCount} size="sm" />
          ) : (
            <span className="text-xs text-muted-foreground">
              Chưa có đánh giá
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <PriceDisplay
            price={pricing.adultPrice || pricing.basePrice || 0}
            childPrice={pricing.childPrice}
            discount={pricing.discountPercent || pricing.discount}
            currency="VND"
            size="sm"
          />
          <Link
            href={`/activities/${slug}`}
            className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}