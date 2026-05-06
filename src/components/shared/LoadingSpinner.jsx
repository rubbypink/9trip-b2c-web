/**
 * LoadingSpinner — Hiển thị skeleton loading hoặc spinner animation.
 * Dùng trong Suspense fallback và các loading state toàn cục.
 * @param {{ size?: 'sm'|'md'|'lg', variant?: 'spinner'|'skeleton'|'card-grid', className?: string }} props
 */
export default function LoadingSpinner({ size = "md", variant = "spinner", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  if (variant === "skeleton") {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
    );
  }

  if (variant === "card-grid") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-card rounded-xl border border-border overflow-hidden">
            <div className="h-48 bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: spinner
  return (
    <div className={`flex items-center justify-center py-12 ${className}`} role="status" aria-label="Đang tải...">
      <div
        className={`${sizeClasses[size]} rounded-full border-border border-t-primary-600 animate-spin`}
      />
      <span className="sr-only">Đang tải...</span>
    </div>
  );
}