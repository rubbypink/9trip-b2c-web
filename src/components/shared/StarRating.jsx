/**
 * StarRatingDisplay - Hiển thị số sao đánh giá (1-5).
 * @param {{ rating: number, count?: number, size?: 'sm'|'md'|'lg', showLabel?: boolean, variant?: 'stars'|'compact' }} props
 */
"use client";

export default function StarRating({ rating = 0, count, size = "sm", showLabel = false, variant = "stars" }) {
  const sizeClass = size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        {rating > 0 && (
          <>
            <svg className={`${sizeClass} text-amber-500 fill-current`} viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
          </>
        )}
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">
            ({count} đánh giá)
          </span>
        )}
      </div>
    );
  }

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(
        <svg key={i} className={`${sizeClass} text-yellow-400 fill-current`} viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    } else if (rating >= i - 0.5) {
      stars.push(
        <svg key={i} className={`${sizeClass} text-yellow-400`} viewBox="0 0 20 20" fill="currentColor">
          <defs>
            <clipPath id={`half-${i}`}>
              <rect x="0" y="0" width="10" height="20" />
            </clipPath>
          </defs>
          <path clipPath={`url(#half-${i})`} d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    } else {
      stars.push(
        <svg key={i} className={`${sizeClass} text-muted-foreground`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex">{stars}</div>
      {showLabel && rating > 0 && <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground ml-1">
          ({count} đánh giá)
        </span>
      )}
    </div>
  );
}