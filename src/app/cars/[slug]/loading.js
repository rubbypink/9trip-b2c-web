/**
 * Car Detail Loading UI — hiển thị khi trang chi tiết xe đang load (ISR).
 */
export default function CarDetailLoading() {
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
            {/* Specs skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4">
                  <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3 mx-auto animate-pulse" />
                </div>
              ))}
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
