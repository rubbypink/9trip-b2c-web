/**
 * Rental Detail Loading UI — hiển thị khi trang chi tiết rental đang load (ISR).
 */
export default function RentalDetailLoading() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            {/* Gallery skeleton */}
            <div className="bg-card rounded-2xl overflow-hidden border border-border">
              <div className="aspect-[4/3] bg-muted animate-pulse" />
            </div>
            {/* Title skeleton */}
            <div className="h-8 bg-muted rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            {/* Description skeleton */}
            <div className="bg-card rounded-xl border border-border p-6 space-y-3">
              <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
              <div className="h-4 bg-muted rounded w-full animate-pulse" />
              <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
          {/* Sidebar skeleton */}
          <aside className="lg:w-96 flex-shrink-0">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-5">
              <div className="h-6 bg-muted rounded w-1/3 animate-pulse mb-4" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
